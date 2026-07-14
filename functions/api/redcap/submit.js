import { readSession, importRecord, importFile, json } from '../_lib/redcap.js';

// FormData key → REDCap file-upload field. Match these to your dictionary.
const IMAGE_FIELDS = {
  img_left_palmar: 'katz_l_palmar',
  img_left_dorsal: 'katz_l_dorsal',
  img_right_palmar: 'katz_r_palmar',
  img_right_dorsal: 'katz_r_dorsal',
};

export async function onRequestPost({ request, env }) {
  const session = await readSession(env, request);       // record id trusted only from signed cookie
  if (!session) return json({ ok: false, error: 'no_session' }, { status: 401 });

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  let fields;
  try { fields = JSON.parse(form.get('fields')); }
  catch { return json({ ok: false, error: 'bad_fields' }, { status: 400 }); }

  // 1) Questionnaire + scoring field map
  try {
    await importRecord(env, { recordId: session.recordId, eventName: session.eventName, fields });
  } catch (err) {
    return json({ ok: false, error: 'import_failed', detail: String(err) }, { status: 502 });
  }

  // 2) Hand-diagram images (best-effort — never discards data imported above)
  const imageErrors = [];
  for (const [formKey, redcapField] of Object.entries(IMAGE_FIELDS)) {
    const file = form.get(formKey);
    if (!file || typeof file === 'string') continue;
    try {
      await importFile(env, {
        recordId: session.recordId, eventName: session.eventName,
        field: redcapField, blob: file, filename: `${formKey}.png`,
      });
    } catch (err) {
      imageErrors.push({ field: redcapField, error: String(err) });
    }
  }
  return json({ ok: true, imageErrors });
}