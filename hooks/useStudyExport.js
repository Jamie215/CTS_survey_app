"use client"

import { useState, useCallback, useRef } from 'react';
import { buildFieldMap } from './useExport';
import { IMAGE_FIELDS, buildImportRow, buildStudyZip, fileBase } from '../lib/studyExport';

function canvasToBytes(canvas) {
  return new Promise((resolve) => {
    if (!canvas) return resolve(null);
    canvas.toBlob(async (blob) => {
      resolve(blob ? new Uint8Array(await blob.arrayBuffer()) : null);
    }, 'image/png');
  });
}

/**
 * Saves the in-person study record (answers in REDCap import format plus
 * the four hand drawings) as one ZIP download. Nothing leaves the device.
 *
 * status: idle → saving → saved | error. `savedName` is the last file
 * written, so the coordinator can check it reached the study drive.
 */
export function useStudyExport({ data, resultsCanvasRefs }) {
  const [status, setStatus] = useState('idle');
  const [savedName, setSavedName] = useState(null);
  const dataRef = useRef(data);              // latest-ref: data is rebuilt every render
  dataRef.current = data;

  const saveStudyFiles = useCallback(async ({ participantId, event }) => {
    setStatus('saving');
    try {
      const images = {};
      for (const [refName, field] of Object.entries(IMAGE_FIELDS)) {
        images[field] = await canvasToBytes(resultsCanvasRefs[refName]?.current);
      }
      const row = buildImportRow({ participantId, event, fieldMap: buildFieldMap(dataRef.current) });
      const base = fileBase(participantId, event);
      const zip = buildStudyZip({ base, row, images });

      const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setSavedName(`${base}.zip`);
      setStatus('saved');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }, [resultsCanvasRefs]);

  return { status, savedName, saveStudyFiles };
}
