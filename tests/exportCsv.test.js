import { describe, it, expect } from 'vitest';
import { buildCsvRows, rowsToCsv } from '../hooks/useExport';
import { SOME_THRESHOLD, HALF_THRESHOLD } from '../data/constants';

/**
 * Unit tests for the CSV export pipeline.
 *
 * buildCsvRows is the pure-function piece extracted from useExport.js
 * so the row contract with REDCap can be asserted without DOM/canvas
 * dependencies. Once REDCap field naming is finalised, the row labels
 * emitted here ARE the data-dictionary contract: a change to a label
 * is a change to a REDCap field name, and these tests are the audit
 * trail tying the two together.
 *
 * Out of scope: download mechanics (Blob, URL.createObjectURL,
 * anchor click) and captureHandDiagrams. Both are exercised by the
 * manual download-verification pass.
 */

function baseExportData(overrides = {}) {
  return {
    participantId: 'CTS-test-001',
    timestamp: '2026-06-22T00:00:00.000Z',
    diagnosticAnswers: {},
    diagnosticEase: 'Very easy',
    diagnosticComments: '',
    diagramEase: 'Very easy',
    diagramComments: '',
    handDiagramImages: {},
    assessmentResults: null,
    katzThresholds: {
      someThresholdPct: SOME_THRESHOLD,
      halfThresholdPct: HALF_THRESHOLD,
    },
    ...overrides,
  };
}

const rowKeys = (rows) => rows.map((r) => r[0]);
const valueFor = (rows, label) => rows.find((r) => r[0] === label)?.[1];

describe('buildCsvRows — top-level identification', () => {
  it('emits participant ID and timestamp first', () => {
    const rows = buildCsvRows(baseExportData());
    expect(rows[0]).toEqual(['Participant ID', 'CTS-test-001']);
    expect(rows[1]).toEqual(['Timestamp', '2026-06-22T00:00:00.000Z']);
  });
});

describe('buildCsvRows — Katz thresholds provenance', () => {
  // Pinning this contract: thresholds travel with each export so
  // historical records remain interpretable if the lab tunes the
  // values mid-study.
  it('emits the threshold values used at the time of export', () => {
    const rows = buildCsvRows(baseExportData());
    expect(valueFor(rows, 'Some Threshold')).toBe(SOME_THRESHOLD);
    expect(valueFor(rows, 'Half Threshold')).toBe(HALF_THRESHOLD);
  });

  it('skips the threshold block entirely when katzThresholds is missing', () => {
    const rows = buildCsvRows(baseExportData({ katzThresholds: undefined }));
    expect(rowKeys(rows)).not.toContain('--- Katz Thresholds (%) ---');
  });
});

describe('buildCsvRows — Kamath section', () => {
  it('skips Kamath when assessmentResults is null', () => {
    const rows = buildCsvRows(baseExportData({ assessmentResults: null }));
    expect(rowKeys(rows)).not.toContain('--- Kamath Score ---');
  });

  it('emits total score and classification when present', () => {
    const rows = buildCsvRows(baseExportData({
      assessmentResults: {
        kamath: { totalScore: 5, classification: 'Classic / Probable CTS' },
      },
    }));
    expect(valueFor(rows, 'Total Score')).toBe(5);
    expect(valueFor(rows, 'Classification')).toBe('Classic / Probable CTS');
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

  it('emits a region_symptom row for every region × symptom combination', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    const keys = rowKeys(rows);
    for (const region of ['thumb_distal', 'index_distal']) {
      for (const symptom of ['pain', 'tingling', 'numbness']) {
        expect(keys).toContain(`${region}_${symptom}`);
      }
    }
  });

  it('formats coverage values to 2 decimal places', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'thumb_distal_pain')).toBe('40.50');
    expect(valueFor(rows, 'thumb_distal_tingling')).toBe('15.00');
    expect(valueFor(rows, 'index_distal_pain')).toBe('30.25');
  });

  it('preserves zero coverage as 0.00 rather than blanking it', () => {
    // Zero is a meaningful research observation — "the participant
    // marked numbness elsewhere but not on the thumb." Blanking it
    // would conflate "observed zero" with "missing data".
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'thumb_distal_numbness')).toBe('0.00');
    expect(valueFor(rows, 'index_distal_tingling')).toBe('0.00');
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
    expect(valueFor(rows, 'dorsum_pain')).toBe('10.00');
    expect(valueFor(rows, 'dorsum_tingling')).toBe('');
    expect(valueFor(rows, 'dorsum_numbness')).toBe('');
  });

  it('emits a region_combined row from detailedCoverage', () => {
    const rows = buildCsvRows(baseExportData(katzFixture()));
    expect(valueFor(rows, 'thumb_distal_combined')).toBe('55.50');
    expect(valueFor(rows, 'index_distal_combined')).toBe('30.25');
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
    expect(rowKeys(rows)).toEqual(expect.arrayContaining(['Hand: left', 'Hand: right']));
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