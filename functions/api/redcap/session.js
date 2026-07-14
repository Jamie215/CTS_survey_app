import { resolveAccessKey, createSessionCookie, json } from '../_lib/redcap.js';

// Adjust to your project's real unique event names.
const TIMEPOINT_LABELS = {
  baseline_arm_1: 'Baseline',
  '6_weeks_arm_1': '6-Week',
  '3_months_arm_1': '3-Month',
};

export async function onRequestGet({ request, env }) {
  const accessKey = new URL(request.url).searchParams.get('k');
  if (!accessKey) return json({ ok: false, error: 'missing_key' }, { status: 400 });

  let resolved;
  try {
    resolved = await resolveAccessKey(env, accessKey);
  } catch (err) {
    return json({ ok: false, error: 'redcap_error', detail: String(err) }, { status: 502 });
  }
  if (!resolved) return json({ ok: false, error: 'invalid_key' }, { status: 404 });

  const cookie = await createSessionCookie(env, resolved);
  return json(
    { ok: true, timepoint: TIMEPOINT_LABELS[resolved.eventName] || null },
    { headers: { 'Set-Cookie': cookie } },
  );
}