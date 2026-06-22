"use client"

import { useState, useCallback } from 'react';
import { diagnosticQuestions } from '../data/diagnosticQuestions';
import { captureHandDiagrams } from '../lib/canvasUtils';
import { SOME_THRESHOLD, HALF_THRESHOLD } from '../data/constants';

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
  diagnosticEase,
  diagnosticComments,
  handDiagramData,
  diagramEase,
  diagramComments,
  assessmentResults,
  consent,
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const buildExportData = useCallback(async () => ({
    participantId,
    timestamp: new Date().toISOString(),
    consent: {
      acknowledged: consent.acknowledged,
      dataSharing: consent.dataSharing,
      acknowledgedAt: consent.acknowledgedAt,
      version: consent.version,
    },
    diagnosticAnswers,
    diagnosticEase,
    diagnosticComments,
    handDiagramImages: await captureHandDiagrams(handDiagramData),
    diagramEase,
    diagramComments,
    assessmentResults,
    katzThresholds: {
      someThreshold: SOME_THRESHOLD,
      halfThreshold: HALF_THRESHOLD,
    },
  }), [
    participantId, diagnosticAnswers, diagnosticEase,
    diagnosticComments, handDiagramData, diagramEase,
    diagramComments, assessmentResults, consent,
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
    const rows = [];

    rows.push(['Participant ID', data.participantId]);
    rows.push(['Timestamp', data.timestamp]);
    rows.push([]);

    rows.push(['--- Diagnostic Answers ---']);
    Object.entries(data.diagnosticAnswers).forEach(([qId, answer]) => {
      const question = diagnosticQuestions.find(q => q.id === Number(qId));
      const label = question.text;
      rows.push([label, Array.isArray(answer) ? answer.join('; ') : answer]);
    });
    rows.push([]);

    rows.push(['Diagnostic Ease', data.diagnosticEase]);
    rows.push(['Diagnostic Comments', data.diagnosticComments]);
    rows.push(['Diagram Ease', data.diagramEase]);
    rows.push(['Diagram Comments', data.diagramComments]);
    rows.push([]);

    // --- Consent ---
    rows.push(['--- Consent ---']);
    rows.push(['Acknowledged', data.consent?.acknowledged ?? '']);
    rows.push(['Acknowledged At', data.consent?.acknowledgedAt ?? '']);
    rows.push(['Consent Version', data.consent?.version ?? '']);
    rows.push([]);

    if (data.assessmentResults?.kamath) {
      rows.push(['--- Kamath Score ---']);
      rows.push(['Total Score', data.assessmentResults.kamath.totalScore]);
      rows.push(['Classification', data.assessmentResults.kamath.classification]);
      rows.push([]);
    }

    if (data.katzThresholds) {
      rows.push(['--- Katz Thresholds ---']);
      rows.push(['Some Threshold', data.katzThresholds.someThreshold]);
      rows.push(['Half Threshold', data.katzThresholds.halfThreshold]);
      rows.push([]);
    }

    if (data.assessmentResults?.katz) {
      rows.push(['--- Katz Scores ---']);
      Object.entries(data.assessmentResults.katz).forEach(([hand, result]) => {
        rows.push([`Hand: ${hand}`]);
        rows.push(['Classification', result.KatzScore?.classification]);
        rows.push(['Classic Pattern Score', result.KatzScore?.score]);

        // Per-symptom coverage: one row per region × symptom.
        const coverageBySymptom = result.KatzScore?.coverageBySymptom;
        if (coverageBySymptom) {
          const allRegions = new Set();
          Object.values(coverageBySymptom).forEach(symptomMap =>
            Object.keys(symptomMap).forEach(r => allRegions.add(r))
          );
          rows.push(['Coverage by symptom (%)']);
          Array.from(allRegions).sort().forEach(region => {
            ['pain', 'tingling', 'numbness'].forEach(symptom => {
              const value = coverageBySymptom[symptom]?.[region];
              rows.push([
                `${region}_${symptom}`,
                typeof value === 'number' ? value.toFixed(2) : '',
              ]);
            });
          });
        }

        // Combined coverage (union of all three symptoms over the region).
        // NOT the sum of per-symptom values — strokes for different
        // symptoms can overlap on the canvas.
        if (result.detailedCoverage) {
          rows.push(['Combined coverage (%)']);
          Object.entries(result.detailedCoverage).forEach(([region, value]) => {
            rows.push([
              `${region}_combined`,
              typeof value === 'number' ? value.toFixed(2) : value,
            ]);
          });
        }
        rows.push([]);
      });
    }

    const csvContent = rows.map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ).join('\n');

    downloadFile(csvContent, `${participantId}_results.csv`, 'text/csv');
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
