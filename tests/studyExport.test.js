import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { toRedcapValues } from '../lib/redcapCoding';
import {
  validateParticipantId, fileBase, buildImportRow, importCsv, buildStudyZip,
} from '../lib/studyExport';

/**
 * The in-person export is the study's only copy of a session, so its
 * file contract is pinned here: REDCap field names, REDCap codes, one
 * import row per session, and the four drawings named after their
 * REDCap file-upload fields.
 */

describe('toRedcapValues', () => {
  it('codes Yes/No questions as 1/0', () => {
    expect(toRedcapValues({ kamath_numb: 'Yes', kamath_wristpain: 'No' }))
      .toEqual({ kamath_numb: 1, kamath_wristpain: 0 });
  });

  it('codes the pregnancy question, ease ratings and Katz classes', () => {
    expect(toRedcapValues({
      kamath_numb_pregnant: 'Not relevant',
      kamath_ease: 'Very easy',
      katz_ease: 'Very difficult',
      katz_l_classification: 'Classic CTS Symptom Distribution',
      katz_r_classification: 'Unlikely CTS',
    })).toEqual({
      kamath_numb_pregnant: 3, kamath_ease: 1, katz_ease: 4,
      katz_l_classification: '3', katz_r_classification: '0',
    });
  });

  it('keeps blanks blank and passes other fields through', () => {
    expect(toRedcapValues({ kamath_numb_wakeup: '', katz_l_thumb_d_pain: '12.50', kamath_comments: 'ok' }))
      .toEqual({ kamath_numb_wakeup: '', katz_l_thumb_d_pain: '12.50', kamath_comments: 'ok' });
  });
});

describe('validateParticipantId', () => {
  it('accepts letters, numbers, - and _', () => {
    expect(validateParticipantId('P-012_a')).toBeNull();
    expect(validateParticipantId('  P012  ')).toBeNull();          // trimmed
  });

  it('rejects empty, spaces, path characters and over-long IDs', () => {
    expect(validateParticipantId('')).toMatch(/Enter/);
    expect(validateParticipantId('P 012')).toMatch(/letters/);
    expect(validateParticipantId('../P012')).toMatch(/letters/);
    expect(validateParticipantId('x'.repeat(33))).toMatch(/letters/);
  });
});

describe('fileBase', () => {
  it('names files by participant, timepoint and local date-time', () => {
    const date = new Date(2026, 9, 20, 14, 2);
    expect(fileBase(' P012 ', 'baseline_arm_1', date)).toBe('CTS_P012_baseline_20261020-1402');
    expect(fileBase('P012', '6_weeks_arm_1', date)).toBe('CTS_P012_6week_20261020-1402');
  });
});

describe('buildImportRow / importCsv', () => {
  const row = buildImportRow({
    participantId: ' P012 ',
    event: 'baseline_arm_1',
    fieldMap: { timestamp: '2026-10-20 14:02', kamath_numb: 'Yes', kamath_comments: 'tingles, at night' },
  });

  it('starts with record_id and redcap_event_name, then coded fields', () => {
    expect(Object.keys(row).slice(0, 2)).toEqual(['record_id', 'redcap_event_name']);
    expect(row).toMatchObject({ record_id: 'P012', redcap_event_name: 'baseline_arm_1', kamath_numb: 1 });
  });

  it('writes one header row and one data row, quoting commas', () => {
    expect(importCsv(row)).toBe(
      'record_id,redcap_event_name,timestamp,kamath_numb,kamath_comments\n'
      + 'P012,baseline_arm_1,2026-10-20 14:02,1,"tingles, at night"\n'
    );
  });
});

describe('buildStudyZip', () => {
  it('bundles the import CSV and every drawing it is given', () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const zip = buildStudyZip({
      base: 'CTS_P012_baseline_20261020-1402',
      row: { record_id: 'P012', redcap_event_name: 'baseline_arm_1' },
      images: { katz_l_palmar: png, katz_l_dorsal: png, katz_r_palmar: png, katz_r_dorsal: null },
    });
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual([
      'CTS_P012_baseline_20261020-1402_katz_l_dorsal.png',
      'CTS_P012_baseline_20261020-1402_katz_l_palmar.png',
      'CTS_P012_baseline_20261020-1402_katz_r_palmar.png',
      'CTS_P012_baseline_20261020-1402_redcap.csv',
    ]);
    expect(strFromU8(files['CTS_P012_baseline_20261020-1402_redcap.csv']))
      .toBe('record_id,redcap_event_name\nP012,baseline_arm_1\n');
    expect(files['CTS_P012_baseline_20261020-1402_katz_l_palmar.png']).toEqual(png);
  });
});
