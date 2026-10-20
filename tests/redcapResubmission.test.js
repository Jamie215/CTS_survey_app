import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestGet as sessionGet } from '../functions/api/redcap/session.js';
import { onRequestPost as submitPost } from '../functions/api/redcap/submit.js';

/**
 * Responses are final once submitted (PI decision): the session and
 * submit functions must refuse a record/event whose `timestamp` is
 * already filled in. REDCap is replaced by an in-memory fake behind a
 * stubbed global fetch.
 */

const env = {
  REDCAP_API_URL: 'https://redcap.test/api/',
  REDCAP_API_TOKEN: 'test-token',
  SESSION_SECRET: 'test-secret',
};

let rows;      // fake REDCap: one row per record/event
let imports;   // record-import payloads received

function fakeRedcap() {
  return vi.fn(async (_url, { body }) => {
    const params = body instanceof URLSearchParams ? body : null;
    if (!params) return new Response('true');                  // file import
    if (params.get('action') === 'import') {
      const data = JSON.parse(params.get('data'));
      imports.push(...data);
      for (const rec of data) {
        const row = rows.find((r) => r.record_id === rec.record_id && r.redcap_event_name === rec.redcap_event_name);
        if (row) Object.assign(row, rec); else rows.push({ ...rec });
      }
      return new Response(JSON.stringify({ count: data.length }));
    }
    const filter = params.get('filterLogic');
    const key = filter && filter.match(/"([^"]*)"/)[1];
    const records = params.get('records');
    const out = rows.filter((r) => (key ? r.access_key === key : r.record_id === records));
    return new Response(JSON.stringify(out));
  });
}

async function openLink(key) {
  const res = await sessionGet({ request: new Request(`https://app.test/api/redcap/session?k=${key}`), env });
  return { res, body: await res.json() };
}

async function submit(cookie) {
  const form = new FormData();
  form.set('fields', JSON.stringify({ timestamp: '2026-10-20 10:00', kamath_numb: 'Yes' }));
  const req = new Request('https://app.test/api/redcap/submit', {
    method: 'POST', body: form, headers: { Cookie: cookie },
  });
  const res = await submitPost({ request: req, env });
  return { res, body: await res.json() };
}

const cookieFrom = (res) => res.headers.get('Set-Cookie').split(';')[0];

beforeEach(() => {
  rows = [
    { record_id: '1', redcap_event_name: 'baseline_arm_1', access_key: 'key-baseline', timestamp: '' },
    { record_id: '1', redcap_event_name: '6_weeks_arm_1', access_key: 'key-6wk', timestamp: '' },
  ];
  imports = [];
  vi.stubGlobal('fetch', fakeRedcap());
});

afterEach(() => vi.unstubAllGlobals());

describe('REDCap resubmission guard', () => {
  it('issues a session for a timepoint that has not been submitted', async () => {
    const { res, body } = await openLink('key-baseline');
    expect(body).toEqual({ ok: true, timepoint: 'Baseline' });
    expect(res.headers.get('Set-Cookie')).toMatch(/^cts_rc_session=/);
  });

  it('accepts the first submission', async () => {
    const { res: s } = await openLink('key-baseline');
    const { body } = await submit(cookieFrom(s));
    expect(body.ok).toBe(true);
    expect(imports).toHaveLength(1);
  });

  it('refuses to reopen a link once that timepoint is submitted', async () => {
    const { res: s } = await openLink('key-baseline');
    await submit(cookieFrom(s));

    const { res, body } = await openLink('key-baseline');
    expect(res.status).toBe(409);
    expect(body).toMatchObject({ ok: false, error: 'already_submitted', timepoint: 'Baseline' });
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('refuses a second submission from a session cookie that is still valid', async () => {
    const { res: s } = await openLink('key-baseline');
    const cookie = cookieFrom(s);
    await submit(cookie);

    const { res, body } = await submit(cookie);
    expect(res.status).toBe(409);
    expect(body.error).toBe('already_submitted');
    expect(imports).toHaveLength(1); // nothing overwritten
  });

  it('keeps other timepoints for the same record open', async () => {
    const { res: s } = await openLink('key-baseline');
    await submit(cookieFrom(s));

    const { body } = await openLink('key-6wk');
    expect(body).toEqual({ ok: true, timepoint: '6-Week' });
  });
});
