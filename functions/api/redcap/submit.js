import { readSession, isEventSubmitted, importRecord, importFile, json } from '../_lib/redcap.js';

// FormData key → REDCap file-upload field. Match these to your dictionary.
const IMAGE_FIELDS = {
  img_left_palmar: 'katz_l_palmar',
  img_left_dorsal: 'katz_l_dorsal',
  img_right_palmar: 'katz_r_palmar',
  img_right_dorsal: 'katz_r_dorsal',
};

// A failed image upload is retried once before it is reported.
const IMAGE_UPLOAD_ATTEMPTS = 2;

export async function onRequestPost({ request, env }) {
  const session = await readSession(env, request);       // record id trusted only from signed cookie
  if (!session) return json({ ok: false, error: 'no_session' }, { status: 401 });

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  let fields;
  try { fields = JSON.parse(form.get('fields')); }
  catch { return json({ ok: false, error: 'bad_fields' }, { status: 400 }); }

  // 1) Questionnaire + scoring field map. Refuse if this event was already
  //    submitted (e.g. a second tab holding a still-valid session cookie).
  try {
    if (await isEventSubmitted(env, session)) {
      return json({ ok: false, error: 'already_submitted' }, { status: 409 });
    }

    await importRecord(env, { recordId: session.recordId, eventName: session.eventName, fields });
  } catch (err) {
    return json({ ok: false, error: 'import_failed', detail: String(err) }, { status: 502 });
  }

  // 2) Hand-diagram images (best-effort — never discards data imported above).
  //    Every expected image is accounted for: one that never arrived is
  //    reported as not_received, one REDCap rejected (after one retry) as
  //    upload_failed with REDCap's error text.
  const imageErrors = [];
  for (const [formKey, redcapField] of Object.entries(IMAGE_FIELDS)) {
    const file = form.get(formKey);
    if (!file || typeof file === 'string') {
      imageErrors.push({ field: redcapField, reason: 'not_received' });
      continue;
    }
    let lastError;
    for (let attempt = 1; attempt <= IMAGE_UPLOAD_ATTEMPTS; attempt++) {
      try {
        await importFile(env, {
          recordId: session.recordId, eventName: session.eventName,
          field: redcapField, blob: file, filename: `${formKey}.png`,
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) imageErrors.push({ field: redcapField, reason: 'upload_failed', error: String(lastError) });
  }

  // 3) Optional coordinator flag: when IMAGE_STATUS_FIELD names a text
  //    field in the REDCap project, record which drawings are missing so
  //    the coordinator can find incomplete records with a report.
  let imageStatusSaved = null;
  if (env.IMAGE_STATUS_FIELD) {
    const status = imageErrors.length === 0
      ? 'complete'
      : `missing: ${imageErrors.map((e) => e.field).join(', ')}`;
    try {
      await importRecord(env, {
        recordId: session.recordId, eventName: session.eventName,
        fields: { [env.IMAGE_STATUS_FIELD]: status },
      });
      imageStatusSaved = true;
    } catch {
      imageStatusSaved = false;
    }
  }

  return json({ ok: true, imageErrors, imageStatusSaved });
}
