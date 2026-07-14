// Shared helpers for the Cloudflare Pages Functions that talk to REDCap.
export const ACCESS_KEY_FIELD = 'access_key';
export const RECORD_ID_FIELD = 'record_id';

export const NON_REDCAP_FIELDS = new Set(); // app-only keys to strip (empty now)
const PROTECTED_FIELDS = new Set([RECORD_ID_FIELD, 'redcap_event_name']);

export function sanitizeFields(fields) {
  const clean = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (NON_REDCAP_FIELDS.has(key)) continue;
    if (PROTECTED_FIELDS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

const YESNO_FIELDS = new Set([
  'kamath_numb', 'kamath_numb_wakeup', 'kamath_numb_firstwakeup',
  'kamath_numb_fingersmed', 'kamath_numb_quickmovements', 'kamath_numb_littlefinger', 'kamath_numb_activities', 'kamath_wristpain', 'kamath_dropobjects', 'kamath_neckpain', 'kamath_toesnumbortingle', 'kamath_splinttried', 'kamath_splinteffectiveness',
]);

const YESNO_CODES = { Yes: 1, No: 0 };

const EASE_CODES = { 'Very easy': 1, 'Somewhat easy': 2, 'Somewhat difficult': 3, 'Very difficult': 4 };

const KATZ_CLASS_CODES = {
  'Unlikely CTS': '0',
  'Possible CTS Symptom Distribution': '1',
  'Probable CTS Symptom Distribution': '2',
  'Classic CTS Symptom Distribution': '3',
};

const RADIO_CODES = {
  kamath_numb_pregnant : { Yes: 1, No: 2, "Not relevant": 3 },
  kamath_ease: EASE_CODES,
  katz_l_clasification: KATZ_CLASS_CODES,
  katz_r_clasification: KATZ_CLASS_CODES,
}

export function toRedcapValues(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === '' || value === null || value === undefined) {
      out[key] = value;
    } else if (YESNO_FIELDS.has(key)) {
      out[key] = YESNO_CODES[value] ?? value;
    } else if (RADIO_CODES[key]) {
      out[key] = RADIO_CODES[key][value] ?? value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours
const SESSION_COOKIE = 'cts_rc_session';

/** POST to the REDCap API (urlencoded, token in body). */
export async function redcapApi(env, params) {
  const body = new URLSearchParams({ 
    token: env.REDCAP_API_TOKEN, 
    ...params,
  }); 
  const res = await fetch(env.REDCAP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`REDCap API error ${res.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return text; }
}

/** 
 *  Resolve an opaque access key to a participant record AND timepoint.
 * 
 * The study is longitudinal (baseline, 6-week, 3 month), sop each invitation carries its own per-record, per-event access ke field and match the exact row to recover both the record id and the REDCap event name for that timepoint.
 */
export async function resolveAccessKey(env, accessKey) {
  if (!accessKey || typeof accessKey !== 'string') return null;
  const rows = await redcapApi(env, {
    content: 'record', 
    format: 'json', 
    type: 'flat',
    fields: `${RECORD_ID_FIELD},${ACCESS_KEY_FIELD}`,
    filterLogic: `[${ACCESS_KEY_FIELD}] = "${accessKey.replace(/"/g, '')}"`,
    returnFormat: 'json',
  });
  if (!Array.isArray(rows)) return null;
  const match = rows.find((r) => r[ACCESS_KEY_FIELD] === accessKey); // exact match in code
  if (!match) return null;
  return { recordId: match[RECORD_ID_FIELD], eventName: match.redcap_event_name || '' };
}

/** Import field map into one record/event. Blank values never wipe data. */
export async function importRecord(env, { recordId, eventName, fields }) {
  const record = {
    ...toRedcapValues(sanitizeFields(fields)),
    [RECORD_ID_FIELD]: recordId,
    ...(eventName ? { redcap_event_name: eventName } : {}),
  };
  return redcapApi(env, {
    content: 'record', 
    action: 'import', 
    format: 'json', 
    type: 'flat',
    overwriteBehavior: 'normal',
    data: JSON.stringify([record]),
    returnContent: 'count', 
    returnFormat: 'json',
  });
}

/** Import one hand-diagram PNG into a REDCap file-upload field (multipart). */
export async function importFile(env, { recordId, eventName, field, blob, filename }) {
  const form = new FormData();
  form.set('token', env.REDCAP_API_TOKEN);
  form.set('content', 'file');
  form.set('action', 'import');
  form.set('record', recordId);
  form.set('field', field);
  if (eventName) form.set('event', eventName);
  form.set('returnFormat', 'json');
  form.set('file', blob, filename);
  const res = await fetch(env.REDCAP_API_URL, { method: 'POST', body: form });
  const text = await res.text();
  if (!res.ok) throw new Error(`REDCap file import error ${res.status}: ${text.slice(0, 300)}`);
  return true;
}

// ── Signed HttpOnly session cookie (record id + event never reach the browser) ──
async function hmac(env, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function createSessionCookie(env, { recordId, eventName }) {
  const payload = { rid: recordId, event: eventName,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = btoa(JSON.stringify(payload));
  const value = `${encoded}.${await hmac(env, encoded)}`;
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${SESSION_TTL_SECONDS}`;
}

export async function readSession(env, request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [encoded, sig] = match[1].split('.');
  if (!encoded || !sig) return null;
  if (sig !== (await hmac(env, encoded))) return null;          // tampered
  let payload;
  try { payload = JSON.parse(atob(encoded)); } catch { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
  return { recordId: payload.rid, eventName: payload.event || '' };
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}