import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestGet as sessionGet } from '../functions/api/redcap/session.js';
import { onRequestPost as submitPost } from '../functions/api/redcap/submit.js';

/**
 * Hand-diagram image uploads are best-effort, but never silent: every
 * expected image that is not stored in REDCap is reported back by field
 * name, and (when IMAGE_STATUS_FIELD is configured) recorded on the
 * record for the coordinator. REDCap is replaced by an in-memory fake
 * behind a stubbed global fetch.
 */

const baseEnv = {
  REDCAP_API_URL: 'https://redcap.test/api/',
  REDCAP_API_TOKEN: 'test-token',
  SESSION_SECRET: 'test-secret',
};

const ALL_IMAGES = ['img_left_palmar', 'img_left_dorsal', 'img_right_palmar', 'img_right_dorsal'];

let rows;          // fake REDCap: one row per record/event
let uploads;       // file-upload attempts, by REDCap field
let failing;       // field → number of upload attempts that should fail

function fakeRedcap() {
  return vi.fn(async (_url, { body }) => {
    if (!(body instanceof URLSearchParams)) {               // file import (multipart)
      const field = body.get('field');
      uploads[field] = (uploads[field] || 0) + 1;
      if ((failing[field] || 0) >= uploads[field]) {
        return new Response('{"error":"The field is not a file upload field"}', { status: 400 });
      }
      return new Response('true');
    }
    if (body.get('action') === 'import') {
      for (const rec of JSON.parse(body.get('data'))) {
        const row = rows.find((r) => r.record_id === rec.record_id && r.redcap_event_name === rec.redcap_event_name);
        Object.assign(row, rec);
      }
      return new Response('{"count":1}');
    }
    const filter = body.get('filterLogic');
    const key = filter && filter.match(/"([^"]*)"/)[1];
    const out = rows.filter((r) => (key ? r.access_key === key : r.record_id === body.get('records')));
    return new Response(JSON.stringify(out));
  });
}

async function submitWith(env, images) {
  const s = await sessionGet({ request: new Request('https://app.test/api/redcap/session?k=key-baseline'), env });
  const cookie = s.headers.get('Set-Cookie').split(';')[0];
  const form = new FormData();
  form.set('fields', JSON.stringify({ timestamp: '2026-10-20 10:00' }));
  for (const key of images) form.set(key, new Blob(['png'], { type: 'image/png' }), `${key}.png`);
  const res = await submitPost({
    request: new Request('https://app.test/api/redcap/submit', { method: 'POST', body: form, headers: { Cookie: cookie } }),
    env,
  });
  return res.json();
}

beforeEach(() => {
  rows = [{ record_id: '1', redcap_event_name: 'baseline_arm_1', access_key: 'key-baseline', timestamp: '' }];
  uploads = {};
  failing = {};
  vi.stubGlobal('fetch', fakeRedcap());
});

afterEach(() => vi.unstubAllGlobals());

describe('REDCap hand-diagram image uploads', () => {
  it('reports no image errors when all four upload', async () => {
    const body = await submitWith(baseEnv, ALL_IMAGES);
    expect(body).toMatchObject({ ok: true, imageErrors: [] });
  });

  it('reports an image the browser never sent as not_received', async () => {
    const body = await submitWith(baseEnv, ALL_IMAGES.filter((k) => k !== 'img_right_dorsal'));
    expect(body.ok).toBe(true);
    expect(body.imageErrors).toEqual([{ field: 'katz_r_dorsal', reason: 'not_received' }]);
  });

  it('retries a failed upload once and succeeds on the second attempt', async () => {
    failing.katz_l_palmar = 1;
    const body = await submitWith(baseEnv, ALL_IMAGES);
    expect(uploads.katz_l_palmar).toBe(2);
    expect(body.imageErrors).toEqual([]);
  });

  it('reports a persistent failure with the field name and REDCap error', async () => {
    failing.katz_l_palmar = 99;
    const body = await submitWith(baseEnv, ALL_IMAGES);
    expect(uploads.katz_l_palmar).toBe(2);
    expect(body.imageErrors).toHaveLength(1);
    expect(body.imageErrors[0]).toMatchObject({ field: 'katz_l_palmar', reason: 'upload_failed' });
    expect(body.imageErrors[0].error).toMatch(/not a file upload field/);
  });

  it('records the missing drawings in IMAGE_STATUS_FIELD when configured', async () => {
    failing.katz_l_palmar = 99;
    const env = { ...baseEnv, IMAGE_STATUS_FIELD: 'katz_images_status' };
    const body = await submitWith(env, ALL_IMAGES.filter((k) => k !== 'img_right_dorsal'));
    expect(body.imageStatusSaved).toBe(true);
    expect(rows[0].katz_images_status).toBe('missing: katz_l_palmar, katz_r_dorsal');
  });

  it('records complete in IMAGE_STATUS_FIELD when every drawing uploaded', async () => {
    const env = { ...baseEnv, IMAGE_STATUS_FIELD: 'katz_images_status' };
    await submitWith(env, ALL_IMAGES);
    expect(rows[0].katz_images_status).toBe('complete');
  });

  it('writes no status field when IMAGE_STATUS_FIELD is not configured', async () => {
    const body = await submitWith(baseEnv, ALL_IMAGES);
    expect(body.imageStatusSaved).toBeNull();
    expect(rows[0]).not.toHaveProperty('katz_images_status');
  });
});
