"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { buildFieldMap } from './useExport';        // reuses the existing field contract
import { submitAssessment } from '../lib/redcapClient';

export function useRedcapSubmit({ enabled, active, data, resultsCanvasRefs }) {
  // idle → submitting → success | error | already_submitted
  const [status, setStatus] = useState('idle');
  const [attempt, setAttempt] = useState(0);         // bumped by retry() to re-run the effect
  const submittedRef = useRef(false);                // fire at most once per attempt
  const dataRef = useRef(data);                      // latest-ref: data is rebuilt every render
  dataRef.current = data;

  useEffect(() => {
    if (!enabled || !active) return;
    if (submittedRef.current) return;
    if (!dataRef.current.assessmentResults) return;

    submittedRef.current = true;
    setStatus('submitting');

    // Results draws the combined canvases on a short timer — wait past it.
    const timer = setTimeout(() => {
      const fieldMap = buildFieldMap({ ...dataRef.current, timestamp: dataRef.current.timestamp });
      const canvases = {
        img_left_palmar: resultsCanvasRefs.combinedLeftVolar.current,
        img_left_dorsal: resultsCanvasRefs.combinedLeftDorsal.current,
        img_right_palmar: resultsCanvasRefs.combinedRightVolar.current,
        img_right_dorsal: resultsCanvasRefs.combinedRightDorsal.current,
      };
      submitAssessment({ fieldMap, canvases })
        .then((result) => {
          if (result.ok) setStatus('success');
          else if (result.error === 'already_submitted') setStatus('already_submitted'); // final, no retry
          else { setStatus('error'); submittedRef.current = false; }                     // allow retry
        })
        .catch(() => { setStatus('error'); submittedRef.current = false; });
    }, 300);

    return () => clearTimeout(timer);
  }, [enabled, active, resultsCanvasRefs, attempt]);

  const retry = useCallback(() => {
    if (submittedRef.current) return;
    setAttempt((n) => n + 1);
  }, []);

  return { status, retry };
}
