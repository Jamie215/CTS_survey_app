"use client"

import { useCallback } from 'react';
import { diagnosticQuestions } from '../data/diagnosticQuestions';

// Splint gateway question ID — distinct from the numbness gateway (id: 0),
// which lives outside diagnosticAnswers as a boolean (data.hasNumbnessOrTingling).
// Splint gateway lives inside diagnosticAnswers as a 'Yes'/'No' string.
// Consider moving to data/constants.js alongside the numbness gateway constant.
const SPLINT_GATEWAY_ID = 12;

const REGION_ABBREV = {
  palm_radial: 'palm_rad',
  palm_ulnar: 'palm_ul',
  dorsum: 'dorsum',
  thumb_proximal: 'thumb_p',
  thumb_distal: 'thumb_d',
  index_proximal: 'index_p',
  index_middle: 'index_m',
  index_distal: 'index_d',
  middle_proximal: 'middle_p',
  middle_middle: 'middle_m',
  middle_distal: 'middle_d',
  wrist: 'wrist',
};

const SYMPTOM_ABBREV = {
  pain: 'pain',
  tingling: 'tingle',
  numbness: 'numb',
};

// --- Section builders --------------------------------------------------------
// Each helper returns a plain object whose keys are REDCap variable names and
// whose values are CSV-/REDCap-friendly strings. Both buildFieldMap (flat) and
// buildCsvRows (sectioned) compose these helpers so the field-name contract
// lives in exactly one place.

function buildQuestionFields(data) {
  const fields = {};
  diagnosticQuestions.forEach(question => {
    const key = question.field ?? `question_${question.id}`;
    let value;

    if (question.hasNumbnessOrTingling) {
      // Numbness gateway: boolean state, translated to Yes/No for consistency.
      value =
        data.hasNumbnessOrTingling === true ? 'Yes'
        : data.hasNumbnessOrTingling === false ? 'No'
        : '';
    } else {
      // Gate-off check uses the LIVE gateway value, not answer presence —
      // a yes→no toggle leaving stale data behind still exports as empty.
      const isGatedOff =
        (question.requiresNumbnessOrTingling && data.hasNumbnessOrTingling === false) ||
        (question.requiresSplintTried && data.diagnosticAnswers?.[SPLINT_GATEWAY_ID] !== 'Yes');

      if (isGatedOff) {
        value = '';
      } else {
        const answer = data.diagnosticAnswers?.[question.id];
        value = Array.isArray(answer) ? answer.join('; ') : (answer ?? '');
      }
    }

    fields[key] = value;
  });
  return fields;
}

function buildFeedbackFields(data) {
  return {
    kamath_ease: data.diagnosticEase ?? '',
    kamath_comments: data.diagnosticComments ?? '',
    katz_ease: data.diagramEase ?? '',
    katz_comments: data.diagramComments ?? '',
  };
}

function buildKamathScoreFields(data) {
  const kamath = data.assessmentResults?.kamath;
  if (!kamath) return {};
  return {
    kamath_totalScore: kamath.totalScore,
    kamath_classification: kamath.classification,
  };
}

function buildKatzHandFields(data, handKey) {
  const katz = data.assessmentResults?.katz;
  if (!katz) return {};

  // Case-insensitive lookup so 'left'/'Left' both resolve.
  const actualKey = Object.keys(katz).find(k => k.toLowerCase() === handKey.toLowerCase());
  if (!actualKey) return {};
  const result = katz[actualKey];

  const sidePrefix = `katz_${handKey.charAt(0).toLowerCase()}`;
  const fields = {};

  fields[`${sidePrefix}_classification`] = result.KatzScore?.classification ?? '';

  // Per-symptom coverage: one entry per region × symptom.
  const coverageBySymptom = result.KatzScore?.coverageBySymptom;
  if (coverageBySymptom) {
    const allRegions = new Set();
    Object.values(coverageBySymptom).forEach(symptomMap =>
      Object.keys(symptomMap).forEach(r => allRegions.add(r))
    );
    Array.from(allRegions).sort().forEach(region => {
      const regionAbbrev = REGION_ABBREV[region] ?? region;
      ['pain', 'tingling', 'numbness'].forEach(symptom => {
        const symptomAbbrev = SYMPTOM_ABBREV[symptom];
        const value = coverageBySymptom[symptom]?.[region];
        fields[`${sidePrefix}_${regionAbbrev}_${symptomAbbrev}`] =
          typeof value === 'number' ? value.toFixed(2) : '';
      });
    });
  }

  // Total coverage = union of all three symptoms over the region, NOT the
  // sum — strokes for different symptoms can overlap on the canvas.
  if (result.detailedCoverage) {
    Object.entries(result.detailedCoverage).forEach(([region, value]) => {
      const regionAbbrev = REGION_ABBREV[region] ?? region;
      fields[`${sidePrefix}_${regionAbbrev}_total`] =
        typeof value === 'number' ? value.toFixed(2) : (value ?? '');
    });
  }

  return fields;
}

// --- Public surface ----------------------------------------------------------

/**
 * Canonical field map: REDCap variable name → value. Pure, sync. This is
 * the single source of truth for the REDCap field contract; both the CSV
 * emitter and the (forthcoming) REDCap submission payload builder consume
 * from the same section helpers, so they cannot drift.
 *
 * @param {Object} data
 * @returns {Object<string, string|number>}
 */
export function buildFieldMap(data) {
  return {
    timestamp: data.timestamp,
    ...buildQuestionFields(data),
    ...buildFeedbackFields(data),
    ...buildKamathScoreFields(data),
    ...buildKatzHandFields(data, 'left'),
    ...buildKatzHandFields(data, 'right'),
  };
}

/**
 * Build CSV rows for the human-readable backup download. Inserts a blank
 * row between sections for visual separation. Pure function.
 *
 * @param {Object} data
 * @returns {Array<Array<string|number>>}
 */
export function buildCsvRows(data) {
  const sections = [
    [['timestamp', data.timestamp]],
    Object.entries(buildQuestionFields(data)),
    Object.entries(buildFeedbackFields(data)),
    Object.entries(buildKamathScoreFields(data)),
    Object.entries(buildKatzHandFields(data, 'left')),
    Object.entries(buildKatzHandFields(data, 'right')),
  ];
  return sections.flatMap((section, i) =>
    i === 0 || section.length === 0 ? section : [[], ...section]
  );
}

/**
 * Serialise CSV rows to text. Quotes any cell containing a comma,
 * a quote, or a newline; doubles internal quotes per RFC 4180.
 */
export function rowsToCsv(rows) {
  return rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  ).join('\n');
}

/**
 * Hook for the CSV backup download.  
 * canvas PNGs are REDCap-bound only and handled by the (forthcoming) submission path, not
 * here. CSV download is a user-initiated backup — typically used when API
 * submission has failed or when a coordinator requests a local copy.
 */
export function useExport({
  diagnosticAnswers,
  hasNumbnessOrTingling,
  diagnosticEase,
  diagnosticComments,
  diagramEase,
  diagramComments,
  assessmentResults,
}) {
  const handleExportCSV = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      diagnosticAnswers,
      hasNumbnessOrTingling,
      diagnosticEase,
      diagnosticComments,
      diagramEase,
      diagramComments,
      assessmentResults,
    };
    const csv = rowsToCsv(buildCsvRows(data));
    const filename = `cts_results_${data.timestamp.replace(/[:.]/g, '-')}.csv`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    diagnosticAnswers, hasNumbnessOrTingling, diagnosticEase, diagnosticComments,
    diagramEase, diagramComments, assessmentResults,
  ]);

  return { handleExportCSV };
}