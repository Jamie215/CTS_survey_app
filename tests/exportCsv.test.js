import { describe, it, expect } from 'vitest';
import { buildCsvRows, rowsToCsv } from '../hooks/useExport';

/**
 * Unit tests for the CSV export pipeline.
 *
 * buildCsvRows is the pure-function piece extracted from useExport.js
 * so the row contract with REDCap can be asserted without DOM/canvas
 * dependencies. The row labels emitted here ARE the REDCap
 * data-dictionary contract (the same helpers feed buildFieldMap, the
 * REDCap submission payload): a change to a label is a change to a
 * REDCap field name, and these tests are the audit trail tying the
 * two together.
 *
 * Out of scope: download mechanics (Blob, URL.createObjectURL,
 * anchor click) and captureHandDiagrams. Both are exercised by the
 * manual download-verification pass.
 */

function baseExportData(overrides = {}) {
  return {
    timestamp: '2026-06-22T00:00:00.000Z',
    diagnosticAnswers: {},
    diagnosticEase: 'Very easy',
    diagnosticComments: '',
    diagramEase: 'Very easy',
    diagramComments: '',
    assessmentResults: null,
    ...overrides,
  };
}

const rowKeys = (rows) => rows.map((r) => r[0]);
const valueFor = (rows, label) => rows.find((r) => r[0] === label)?.[1];

describe('buildCsvRows — top-level identification', () => {
  // The record is identified by REDCap (record id + event), so the
  // export carries no participant ID of its own.
  it('emits the timestamp first', () => {
    const rows = buildCsvRows(baseExportData());
    expect(rows[0]).toEqual(['timestamp', '2026-06-22T00:00:00.000Z']);
  });
});

describe('buildCsvRows — Kamath section', () => {
  it('skips Kamath when assessmentResults is null', () => {
    const rows = buildCsvRows(baseExportData({ assessmentResults: null }));
    expect(rowKeys(rows)).not.toContain('kamath_score');
    expect(rowKeys(rows)).not.toContain('kamath_classification');
  });

  it('emits total score and classification when present', () => {
    const rows = buildCsvRows(baseExportData({
      assessmentResults: {
        kamath: { totalScore: 5, classification: 'Classic / Probable CTS' },
      },
    }));
    expect(valueFor(rows, 'kamath_score')).toBe(5);
    expect(valueFor(rows, 'kamath_classification')).toBe('Classic / Probable CTS');
  });
});

describe('buildCsvRows — Katz per-symptom coverage', () => {
  function katzFixture() {
    return {
      assessmentResults: {
        katz: {
          left: {
            KatzScore: {
              score: 3,
              classification: 'Classic CTS Symptom Distribution',
              coverageBySymptom: {
                pain:     { thumb_distal: 40.5, index_distal: 30.25 },
                tingling: { thumb_distal: 15.0, index_distal: 0 },
                numbness: { thumb_distal: 0,    index_distal: 0 },
              },
            },
            detailedCoverage: {
              thumb_distal: 55.5,
              index_distal: 30.25,
            },
          },
        },
      },
    };
  }

  it('emits the per-hand classification', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'katz_l_classification')).toBe('Classic CTS Symptom Distribution');
  });

  it('emits a region_symptom row for every region × symptom combination', () => {
    // Field names use the REDCap abbreviations: thumb_distal → thumb_d,
    // tingling → tingle, numbness → numb.
    const rows = buildCsvRows(baseExportData(katzFixture()));
    const keys = rowKeys(rows);
    for (const region of ['thumb_d', 'index_d']) {
      for (const symptom of ['pain', 'tingle', 'numb']) {
        expect(keys).toContain(`katz_l_${region}_${symptom}`);
      }
    }
  });

  it('formats coverage values to 2 decimal places', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'katz_l_thumb_d_pain')).toBe('40.50');
    expect(valueFor(rows, 'katz_l_thumb_d_tingle')).toBe('15.00');
    expect(valueFor(rows, 'katz_l_index_d_pain')).toBe('30.25');
  });

  it('preserves zero coverage as 0.00 rather than blanking it', () => {
    // Zero is a meaningful research observation — "the participant
    // marked numbness elsewhere but not on the thumb." Blanking it
    // would conflate "observed zero" with "missing data".
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'katz_l_thumb_d_numb')).toBe('0.00');
    expect(valueFor(rows, 'katz_l_index_d_tingle')).toBe('0.00');
  });

  it('emits blank for a region × symptom combo absent from coverageBySymptom', () => {
    // Distinct from the zero case above. If the symptom map didn't
    // contain the key at all, blank is correct.
    const rows = buildCsvRows(baseExportData({
      assessmentResults: {
        katz: {
          left: {
            KatzScore: {
              coverageBySymptom: {
                pain:     { dorsum: 10 },
                tingling: {},
                numbness: {},
              },
            },
            detailedCoverage: { dorsum: 10 },
          },
        },
      },
    }));
    expect(valueFor(rows, 'katz_l_dorsum_pain')).toBe('10.00');
    expect(valueFor(rows, 'katz_l_dorsum_tingle')).toBe('');
    expect(valueFor(rows, 'katz_l_dorsum_numb')).toBe('');
  });

  it('emits a region_total row from detailedCoverage', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'katz_l_thumb_d_total')).toBe('55.50');
    expect(valueFor(rows, 'katz_l_index_d_total')).toBe('30.25');
  });

  it('emits both hands when both are present', () => {
    const rows = buildCsvRows(baseExportData({
      assessmentResults: {
        katz: {
          left:  { KatzScore: { coverageBySymptom: { pain: { thumb_distal: 1 }, tingling: {}, numbness: {} } }, detailedCoverage: {} },
          right: { KatzScore: { coverageBySymptom: { pain: { thumb_distal: 2 }, tingling: {}, numbness: {} } }, detailedCoverage: {} },
        },
      },
    }));
    expect(valueFor(rows, 'katz_l_thumb_d_pain')).toBe('1.00');
    expect(valueFor(rows, 'katz_r_thumb_d_pain')).toBe('2.00');
  });
});

describe('rowsToCsv — RFC 4180 escaping', () => {
  it('quotes cells containing a comma', () => {
    expect(rowsToCsv([['simple', 'has, comma']])).toBe('simple,"has, comma"');
  });

  it('quotes cells containing a quote and doubles internal quotes', () => {
    expect(rowsToCsv([['simple', 'has "quote"']])).toBe('simple,"has ""quote"""');
  });

  it('quotes cells containing a newline', () => {
    expect(rowsToCsv([['simple', 'has\nnewline']])).toBe('simple,"has\nnewline"');
  });

  it('coerces null and undefined to empty string', () => {
    expect(rowsToCsv([[null, undefined]])).toBe(',');
  });

  it('emits an empty line for a zero-cell row (section separator)', () => {
    expect(rowsToCsv([['a'], [], ['b']])).toBe('a\n\nb');
  });
});