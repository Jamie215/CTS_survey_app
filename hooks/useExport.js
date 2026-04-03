"use client"

import { useState, useCallback } from 'react';
import { diagnosticQuestions } from '../data/diagnosticQuestions';

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
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const buildExportData = useCallback(() => ({
    participantId,
    timestamp: new Date().toISOString(),
    diagnosticAnswers,
    diagnosticEase,
    diagnosticComments,
    handDiagramData,
    diagramEase,
    diagramComments,
    assessmentResults,
  }), [
    participantId, diagnosticAnswers, diagnosticEase,
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

  const handleExportJSON = useCallback(() => {
    const data = buildExportData();
    downloadFile(
      JSON.stringify(data, null, 2),
      `${participantId}_results.json`,
      'application/json'
    );
  }, [buildExportData, downloadFile, participantId]);

  const handleExportCSV = useCallback(() => {
    const data = buildExportData();
    const rows = [];

    rows.push(['Participant ID', data.participantId]);
    rows.push(['Timestamp', data.timestamp]);
    rows.push([]);

    rows.push(['--- Diagnostic Answers ---']);
    Object.entries(data.diagnosticAnswers).forEach(([qId, answer]) => {
      const question = diagnosticQuestions.find(q => q.id === qId);
      const label = question ? question.question : qId;
      rows.push([label, Array.isArray(answer) ? answer.join('; ') : answer]);
    });
    rows.push([]);

    rows.push(['Diagnostic Ease', data.diagnosticEase]);
    rows.push(['Diagnostic Comments', data.diagnosticComments]);
    rows.push(['Diagram Ease', data.diagramEase]);
    rows.push(['Diagram Comments', data.diagramComments]);
    rows.push([]);

    if (data.assessmentResults?.kamath) {
      rows.push(['--- Kamath Score ---']);
      rows.push(['Total Score', data.assessmentResults.kamath.totalScore]);
      rows.push(['Max Possible', data.assessmentResults.kamath.maxPossible]);
      rows.push(['Percentage', data.assessmentResults.kamath.percentage]);
      rows.push(['Classification', data.assessmentResults.kamath.classification]);
      rows.push([]);
    }

    if (data.assessmentResults?.katz) {
      rows.push(['--- Katz Scores ---']);
      Object.entries(data.assessmentResults.katz).forEach(([hand, result]) => {
        rows.push([`Hand: ${hand}`]);
        rows.push(['Classification', result.KatzScore?.classification]);
        rows.push(['Classic Pattern Score', result.KatzScore?.classicPatternScore]);
        if (result.detailedCoverage) {
          Object.entries(result.detailedCoverage).forEach(([region, value]) => {
            rows.push([`Coverage - ${region}`, typeof value === 'number' ? value.toFixed(2) : value]);
          });
        }
        rows.push([]);
      });
    }

    rows.push(['--- Hand Diagram Data ---']);
    Object.entries(data.handDiagramData).forEach(([canvasKey, points]) => {
      rows.push([canvasKey, `${(points || []).length} data points`]);
    });

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

  return {
    showDownloadMenu,
    handleExportJSON,
    handleExportCSV,
    handlePrint,
    handleToggleDownloadMenu,
  };
}
