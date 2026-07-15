"use client";
import { useState, useEffect, useRef } from 'react';
import { buildFieldMap } from './useExport';        // reuses the existing field contract
import { submitAssessment } from '../lib/redcapClient';

export function useRedcapSubmit({ enabled, active, data, resultsCanvasRefs }) {
  const [status, setStatus] = useState('idle');      // idle → submitting → success | error
  const submittedRef = useRef(false);                // fire at most once
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
          setStatus(result.ok ? 'success' : 'error');
          if (!result.ok) submittedRef.current = false; // allow retry
        })
        .catch(() => { setStatus('error'); submittedRef.current = false; });
    }, 300);

    return () => clearTimeout(timer);
  }, [enabled, active, resultsCanvasRefs]);

  return { status };
}