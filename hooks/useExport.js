"use client"

import { useState, useCallback } from 'react';
import { diagnosticQuestions } from '../data/diagnosticQuestions';
import { captureHandDiagrams } from '../lib/canvasUtils';
import { MIN_THRESHOLD, HALF_THRESHOLD } from '../data/constants';

/**
 * Build the CSV row array from an export-data payload. Pure function —
 * no DOM, no captureHandDiagrams, no download. Extracted so the row
 * contract with REDCap can be tested directly. Once REDCap field
 * naming is finalised, the row labels emitted here become the
 * data-dictionary contract.
 *
 * @param {Object} data
 * @returns {Array<Array<string|number|boolean|null>>}
 */
export function buildCsvRows(data) {
  const rows = [];

  rows.push(['timestamp', data.timestamp]);
  rows.push([]);

  diagnosticQuestions.forEach(question => {
  const label = question.field ?? `Question ${question.id}`;
  let value;

  if (question.hasNumbnessOrTingling) {
    // Question 0: value lives in its own state, not in diagnosticAnswers.
    // Translate the boolean to a string consistent with other Yes/No answers.
    value =
      data.hasNumbnessOrTingling === true ? 'Yes'
      : data.hasNumbnessOrTingling === false ? 'No'
      : '';
  } else {
    // Gate-off check is computed at export time from the live gateway
    // value, NOT from whether an answer is present — so a yes→no toggle
    // that left stale data behind still exports as NA.
    const isGatedOff =
      (question.requiresNumbnessOrTingling && data.hasNumbnessOrTingling === false) ||
      (question.requiresSplintTried && data.diagnosticAnswers?.[12] !== 'Yes');

    if (isGatedOff) {
      value = 'NA';  // Not applicable due to gating
    } else {
      const answer = data.diagnosticAnswers?.[question.id];
      value = Array.isArray(answer) ? answer.join('; ') : (answer ?? '');
    }
  }

  rows.push([label, value]);
});
  rows.push([]);

  rows.push(['kamath_ease', data.diagnosticEase]);
  rows.push(['kamath_comments', data.diagnosticComments]);
  rows.push(['katz_ease', data.diagramEase]);
  rows.push(['katz_comments', data.diagramComments]);
  rows.push([]);

  if (data.assessmentResults?.kamath) {
    rows.push(['kamath_totalScore', data.assessmentResults.kamath.totalScore]);
    rows.push(['kamath_classification', data.assessmentResults.kamath.classification]);
    rows.push([]);
  }

  if (data.assessmentResults?.katz) {
    Object.entries(data.assessmentResults.katz).forEach(([hand, result]) => {
      rows.push([`katz_${hand.toLowerCase().at(0)}_classification`, result.KatzScore?.classification]);

      // Per-symptom coverage: one row per region × symptom.
      const coverageBySymptom = result.KatzScore?.coverageBySymptom;
      if (coverageBySymptom) {
        const allRegions = new Set();
        Object.values(coverageBySymptom).forEach(symptomMap =>
          Object.keys(symptomMap).forEach(r => allRegions.add(r))
        );
        Array.from(allRegions).sort().forEach(region => {
          ['pain', 'tingling', 'numbness'].forEach(symptom => {
            const symptomAbbrev = symptom === 'pain' ? 'pain' : symptom === 'tingling' ? 'tingle' : symptom === 'numbness' ? 'numb' : '';
            const regionAbbrev = region === 'palm_radial' ? 'palm_rad' : region === 'palm_ulnar' ? 'palm_ul' : region === 'dorsum' ? 'dorsum' : region === 'thumb_proximal' ? 'thumb_p' : region === 'thumb_distal' ? 'thumb_d' : region === 'index_proximal' ? 'index_p' : region === 'index_middle' ? 'index_m' : region === 'index_distal' ? 'index_d' : region === 'middle_proximal' ? 'middle_p' : region === 'middle_middle' ? 'middle_m' : region === 'middle_distal' ? 'middle_d' : region === 'wrist' ? 'wrist' : '';
            const value = coverageBySymptom[symptom]?.[region];
            rows.push([
              `katz_${hand.toLowerCase().at(0)}_${regionAbbrev}_${symptomAbbrev}`,
              typeof value === 'number' ? value.toFixed(2) : '',
            ]);
          });
        });
      }

      // Total coverage (union of all three symptoms over the region).
      // NOT the sum of per-symptom values — strokes for different
      // symptoms can overlap on the canvas.
      if (result.detailedCoverage) {
        Object.entries(result.detailedCoverage).forEach(([region, value]) => {
          const regionAbbrev = region === 'palm_radial' ? 'palm_rad' : region === 'palm_ulnar' ? 'palm_ul' : region === 'dorsum' ? 'dorsum' : region === 'thumb_proximal' ? 'thumb_p' : region === 'thumb_distal' ? 'thumb_d' : region === 'index_proximal' ? 'index_p' : region === 'index_middle' ? 'index_m' : region === 'index_distal' ? 'index_d' : region === 'middle_proximal' ? 'middle_p' : region === 'middle_middle' ? 'middle_m' : region === 'middle_distal' ? 'middle_d' : region === 'wrist' ? 'wrist' : '';
          rows.push([
            `katz_${hand.toLowerCase().at(0)}_${regionAbbrev}_total`,
            typeof value === 'number' ? value.toFixed(2) : value,
          ]);
        });
      }
      rows.push([]);
    });
  }

  return rows;
}

/**
 * Serialise CSV rows to text. Quotes any cell containing a comma,
 * a quote, or a newline; doubles internal quotes per RFC 4180.
 *
 * @param {Array<Array<string|number|boolean|null>>} rows
 * @returns {string}
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
 * Custom hook for building export data and downloading results.
 *
 * @param {Object} params
 * @param {string} params.participantId
 * @param {Object} params.diagnosticAnswers
 * @param {string} params.diagnosticEase
 * @param {string} params.diagnosticComments
 * @param {Object} params.handDiagramData
 * @param {string} params.diagramEase
 * @param {string} params.diagramComments
 * @param {Object|null} params.assessmentResults
 * @returns {Object}
 */
export function useExport({
  participantId,
  diagnosticAnswers,
  hasNumbnessOrTingling,
  diagnosticEase,
  diagnosticComments,
  handDiagramData,
  diagramEase,
  diagramComments,
  assessmentResults,
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const buildExportData = useCallback(async () => ({
    participantId,
    timestamp: new Date().toISOString(),
    diagnosticAnswers,
    hasNumbnessOrTingling,
    diagnosticEase,
    diagnosticComments,
    handDiagramImages: await captureHandDiagrams(handDiagramData),
    diagramEase,
    diagramComments,
    assessmentResults,
    katzThresholds: {
      minThresholdPct: MIN_THRESHOLD,
      halfThresholdPct: HALF_THRESHOLD,
    },
  }), [
    participantId, diagnosticAnswers, hasNumbnessOrTingling, diagnosticEase,
    diagnosticComments, handDiagramData, diagramEase,
    diagramComments, assessmentResults,
  ]);

  const downloadFile = useCallback((content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }, []);

  const handleExportJSON = useCallback(async () => {
    const data = await buildExportData();
    downloadFile(
      JSON.stringify(data, null, 2),
      `${participantId}_results.json`,
      'application/json'
    );
  }, [buildExportData, downloadFile, participantId]);

  const handleExportCSV = useCallback(async () => {
    const data = await buildExportData();
    downloadFile(
      rowsToCsv(buildCsvRows(data)),
      `${participantId}_results.csv`,
      'text/csv'
    );
  }, [buildExportData, downloadFile, participantId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleToggleDownloadMenu = useCallback(() => {
    setShowDownloadMenu(prev => !prev);
  }, []);

  const handleCloseDownloadMenu = useCallback(() => {
    setShowDownloadMenu(false);
  }, []);

  return {
    showDownloadMenu,
    handleExportJSON,
    handleExportCSV,
    handlePrint,
    handleToggleDownloadMenu,
    handleCloseDownloadMenu,
  };
}