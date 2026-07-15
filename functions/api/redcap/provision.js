import { provisionRecordKeys, json } from './_lib/redcap.js';

// 3 Longitudinal events that each need their own access key
const EVENT_NAMES = ['baseline_arm_1', '6_weeks_arm_1', '3_months_arm_1'];

/**
 * REDCap Data Entry Trigger (DET) handler.
 * REDCap POSTs here (application/x-www-form-urlencoded) every time a record
 * is created or saved. On the first fire for a record we generate a unique
 * access key for each of the three events and write them back via the API,
 * so the scheduled Alerts can later pipe [access_key] into the invitation
 * link. Idempotent — subsequent saves find the keys already present and do
 * nothing.
 * 
 * Security: DET requests are unauthenticated by REDCap, so we gate on a
 * shared secret carried in the URL (?s=...) and verify the project id.
 */
export async function onRequestPost({ request, env }) {
  // 1) Shared-secret gate — reject anything not carrying our secret.
  const url = new URL(request.url);
  if (!env.PROVISION_SECRET || url.searchParams.get('s') !== env.PROVISION_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 2) Parse the DET form payload.
  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  const projectId = form.get('project_id');
  const recordId = form.get('record');

  // 3) Confirm the call is for the project we expect (when configured).
  if (env.REDCAP_PROJECT_ID && String(projectId) !== String(env.REDCAP_PROJECT_ID)) {
    return json({ ok: false, error: 'wrong_project' }, { status: 403 });
  }
  if (!recordId) return json({ ok: false, error: 'missing_record' }, { status: 400 });

  // 4) Fill any missing per-event keys. Never rotates an existing key.
  try {
    const created = await provisionRecordKeys(env, { recordId, eventNames: EVENT_NAMES });
    return json({ ok: true, record: recordId, provisioned: created });
  } catch (err) {
    return json({ ok: false, error: 'provision_failed', detail: String(err) }, { status: 502 });
  }
}