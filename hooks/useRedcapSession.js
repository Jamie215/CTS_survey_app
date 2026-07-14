"use client";
import { useState, useEffect } from 'react';
import { resolveSession } from '../lib/redcapClient';

export function useRedcapSession() {
  // 'none' | 'resolving' | 'ready' | 'invalid' | 'error'
  const [status, setStatus] = useState('none');
  const [timepoint, setTimepoint] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accessKey = new URLSearchParams(window.location.search).get('k');
    if (!accessKey) { setStatus('none'); return; }   // standalone/anonymous mode

    let cancelled = false;
    setStatus('resolving');
    resolveSession(accessKey)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) { setTimepoint(result.timepoint || null); setStatus('ready'); }
        else setStatus(result.error === 'invalid_key' ? 'invalid' : 'error');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  return { redcapEnabled: status === 'ready', status, timepoint };
}