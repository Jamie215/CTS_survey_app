"use client";

export async function resolveSession(accessKey) {
  const res = await fetch(`/api/redcap/session?k=${encodeURIComponent(accessKey)}`, {
    method: 'GET',
    credentials: 'same-origin', // let the Set-Cookie session stick
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    if (!canvas) return resolve(null);
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function submitAssessment({ fieldMap, canvases = {} }) {
  const form = new FormData();
  form.set('fields', JSON.stringify(fieldMap));
  await Promise.all(Object.entries(canvases).map(async ([key, canvas]) => {
    const blob = await canvasToBlob(canvas);
    if (blob) form.set(key, blob, `${key}.png`);
  }));
  const res = await fetch('/api/redcap/submit', {
    method: 'POST', credentials: 'same-origin', body: form,
  });
  return res.json().catch(() => ({ ok: false, error: 'network' }));
}