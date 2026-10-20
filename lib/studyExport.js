/**
 * In-person study export (option 1a): everything one completed session
 * produces, bundled into a single ZIP for the encrypted study drive.
 *
 *   <base>_redcap.csv          one row, REDCap field names and codes,
 *                              ready for REDCap's Data Import Tool
 *   <base>_katz_l_palmar.png   the four combined hand drawings, named
 *   <base>_katz_l_dorsal.png   after the REDCap file-upload fields they
 *   <base>_katz_r_palmar.png   are uploaded to
 *   <base>_katz_r_dorsal.png
 *
 * Pure functions only, so the file contract can be unit-tested.
 */
import { zipSync, strToU8 } from 'fflate';
import { rowsToCsv } from '../hooks/useExport';
import { toRedcapValues } from './redcapCoding';
import { STUDY_TIMEPOINTS } from '../data/constants';

// Results-page canvas → REDCap file-upload field.
export const IMAGE_FIELDS = {
  combinedLeftVolar: 'katz_l_palmar',
  combinedLeftDorsal: 'katz_l_dorsal',
  combinedRightVolar: 'katz_r_palmar',
  combinedRightDorsal: 'katz_r_dorsal',
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** Error message for an unusable participant ID, or null when it is fine. */
export function validateParticipantId(id) {
  const value = (id ?? '').trim();
  if (!value) return 'Enter the participant ID.';
  if (!ID_PATTERN.test(value)) {
    return 'Use letters, numbers, - or _ only (up to 32 characters).';
  }
  return null;
}

export function timepointFor(event) {
  return STUDY_TIMEPOINTS.find((t) => t.event === event) || null;
}

/** e.g. CTS_P012_baseline_20261020-1402 */
export function fileBase(participantId, event, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `CTS_${participantId.trim()}_${timepointFor(event).slug}_${stamp}`;
}

/** One REDCap import row: record, event, then the coded field map. */
export function buildImportRow({ participantId, event, fieldMap }) {
  return {
    record_id: participantId.trim(),
    redcap_event_name: event,
    ...toRedcapValues(fieldMap),
  };
}

/** Header row + one data row (REDCap "records as rows" import format). */
export function importCsv(row) {
  const keys = Object.keys(row);
  return rowsToCsv([keys, keys.map((k) => row[k])]) + '\n';
}

/**
 * @param {Object} args
 * @param {string} args.base     file-name prefix from fileBase()
 * @param {Object} args.row      from buildImportRow()
 * @param {Object<string, Uint8Array>} args.images  REDCap field → PNG bytes
 * @returns {Uint8Array} ZIP bytes
 */
export function buildStudyZip({ base, row, images }) {
  const files = { [`${base}_redcap.csv`]: strToU8(importCsv(row)) };
  for (const [field, bytes] of Object.entries(images)) {
    if (bytes) files[`${base}_${field}.png`] = [bytes, { level: 0 }];   // PNGs are already compressed
  }
  return zipSync(files);
}
