"use client"

import React, { useEffect, useRef } from 'react';
import { AlertCircle, ChartBarBig, Download, ChevronsUp, ChevronRight, Printer } from 'lucide-react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, KAMATH_COLORS, KATZ_REGIONS, MIN_THRESHOLD, HALF_THRESHOLD } from '../../data/constants';
import { diagnosticQuestions } from '../../data/diagnosticQuestions';
import { KAMATH_BANDS } from '../../lib/kamathScoring';
import Modal from '../Modal';

/**
 * Results section - displays Kamath-based and Katz-based scoring results.
 *
 * @param {Object} props
 * @param {Object|null} props.assessmentResults
 * @param {boolean} props.showResultsDetailsModal
 * @param {boolean|null} props.isResultsDetailShown
 * @param {Function} props.onSetResultsDetailShown
 * @param {Function} props.onCloseModal
 * @param {Object} props.resultsCanvasRefs
 * @param {Object} props.exportActions - { showDownloadMenu, handleExportJSON, handleExportCSV, handlePrint, handleToggleDownloadMenu }
 */
export default function Results({
  assessmentResults,
  showResultsDetailsModal,
  isResultsDetailShown,
  onSetResultsDetailShown,
  onCloseModal,
  resultsCanvasRefs,
  exportActions,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Assessment Results
        </h2>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-medium text-purple-800">Important Note</p>
              <p className="text-lg text-purple-700">
                This assessment tool is for screening purposes only and should not replace professional medical diagnosis.
                If you have concerns about your symptoms, please consult with a healthcare provider for proper evaluation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KAMATH-BASED SCORE */}
      {assessmentResults?.kamath && (
        <KamathScoreCard
          kamath={assessmentResults.kamath}
          isResultsDetailShown={isResultsDetailShown}
        />
      )}

      {/* KATZ-BASED SCORE */}
      {assessmentResults?.katz && (
        <KatzScoreCard
          katz={assessmentResults.katz}
          isResultsDetailShown={isResultsDetailShown}
          resultsCanvasRefs={resultsCanvasRefs}
        />
      )}

      {/* Modal rendered via parent navigation area */}
      {showResultsDetailsModal && (
        <ResultsModal
          onPatient={() => { onSetResultsDetailShown(false); onCloseModal(); }}
          onClinician={() => { onSetResultsDetailShown(true); onCloseModal(); }}
        />
      )}
    </div>
  );
}

function ResultsModal({ onPatient, onClinician }) {
  const titleId = 'results-modal-title';

  // No `onClose` semantic here — the user must pick a role. We pass
  // a no-op so Escape doesn't dismiss without a choice. (If you'd
  // rather Escape defaulted to "I'm a patient", swap the no-op for
  // onPatient.)
  const handleClose = () => {};

  return (
    <Modal open={true} onClose={handleClose} titleId={titleId}>
      <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <ChartBarBig className="w-7 h-7 text-purple-600" />
      </div>
      <h2 id={titleId} className="sr-only">
        Choose how to display your results
      </h2>
      <p className="text-gray-500 text-lg mb-8">Please select the option that best describes you.</p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={onPatient}
          className="flex-1 px-6 py-4 bg-gray-100 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-purple-300"
        >
          I&apos;m a Patient
        </button>
        <button
          onClick={onClinician}
          className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors border-2 border-transparent hover:border-purple-800"
        >
          I&apos;m a Healthcare Professional
        </button>
      </div>
    </Modal>
  );
}

function KamathScoreCard({ kamath, isResultsDetailShown }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden results-block">
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Likelihood of CTS based on the Questionnaire</h3>
        <p className="text-sm text-gray-600 mt-1">Questionnaire-based assessment adapted from Kamath &amp; Stothard (2003)</p>
      </div>

      <div className={`p-6 ${KAMATH_COLORS[kamath.colorClass].bg}`}>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <div className={`text-2xl font-bold ${KAMATH_COLORS[kamath.colorClass].text}`}>
              {kamath.classification}
            </div>
            <p className="text-gray-600 mt-1">{kamath.description}</p>
          </div>
          {isResultsDetailShown && (
            <div className="text-right">
              <span className={`text-4xl font-bold ${KAMATH_COLORS[kamath.colorClass].text}`}>
                {kamath.totalScore}
              </span>
              <span className="text-gray-500 text-lg ml-1">pts</span>
            </div>
          )}
        </div>

        {/*
          Legend driven by KAMATH_BANDS (the source of truth for the
          classification rule). If a boundary is tuned in
          lib/kamathScoring.js, this row updates automatically.
        */}
        {isResultsDetailShown && (
          <div className="flex flex-wrap gap-4 text-sm py-3 border-t border-gray-200">
            {KAMATH_BANDS.map((band) => (
              <span
                key={band.classification}
                className={`${KAMATH_COLORS[band.colorClass].text} font-medium`}
              >
                ● {band.legendLabel}
              </span>
            ))}
          </div>
        )}

        {isResultsDetailShown && (
          <details className="mt-4">
            <summary className="cursor-pointer text-lg font-medium text-purple-600 hover:text-purple-800">
              View score breakdown
            </summary>
            <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-600">Question</th>
                    <th className="text-center py-2 text-gray-600 w-28">Answer</th>
                    <th className="text-center py-2 text-gray-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {kamath.scoredQuestions.map((q) => {
                    const question = diagnosticQuestions.find(dq => dq.id === q.id);
                    return (
                      <tr key={q.id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-700">{question?.text}</td>
                        <td className="py-2 text-center text-gray-700 w-28">{q.answer}</td>
                        <td className={`py-2 text-center font-medium ${
                          q.score > 0 ? 'text-green-600' : q.score < 0 ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {q.score > 0 ? '+' : ''}{q.score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="py-2" colSpan={2}>Total</td>
                    <td className={`py-2 text-right ${KAMATH_COLORS[kamath.colorClass].text}`}>
                      {kamath.totalScore}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function KatzScoreCard({ katz, isResultsDetailShown, resultsCanvasRefs }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden results-block">
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Likelihood of CTS based on the Drawings</h3>
        <p className="text-sm text-gray-600 mt-1">Symptom distribution assessment adapted from Katz et al. (1990)</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['left', 'right'].map((hand) => (
            <KatzHandResult
              key={hand}
              hand={hand}
              result={katz[hand]}
              isResultsDetailShown={isResultsDetailShown}
              volarRef={hand === 'left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar}
              dorsalRef={hand === 'left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Per-region coverage breakdown table.
 *
 * One row per Katz region (from KATZ_REGIONS), with one column per
 * symptom plus a Combined column. Combined is the union of all three
 * symptom layers measured against the region — NOT the sum of the
 * three per-symptom values, because the user's strokes for different
 * symptoms can overlap on the canvas.
 */
function CoverageTable({ result }) {
  const coverageBySymptom = result.KatzScore?.coverageBySymptom || {};
  const detailedCoverage = result.detailedCoverage || {};
  const fmt = (v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—');
  const cell = (symptom, region) => fmt(coverageBySymptom?.[symptom]?.[region]);

  return (
    <div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-2 font-medium text-gray-600 text-left">Region</th>
            <th className="py-2 px-1 font-medium text-orange-600 text-center max-md:hidden">Pain</th>
            <th className="py-2 px-1 font-medium text-purple-600 text-center max-md:hidden">Tingling</th>
            <th className="py-2 px-1 font-medium text-blue-600 text-center max-md:hidden">Numbness</th>
            <th className="py-2 pl-1 font-medium text-gray-700 text-center">Combined</th>
          </tr>
        </thead>
        <tbody>
          {KATZ_REGIONS.map(({ key, group, label }) => (
            <tr key={key} className="border-b border-gray-100">
              <td className="py-1.5 pr-2 text-gray-700 text-left">
                <span className="font-medium">{group}</span>
                {label && <span className="text-gray-500">: {label}</span>}
              </td>
              <td className="py-1.5 px-1 text-gray-600 text-center max-md:hidden">{cell('pain', key)}</td>
              <td className="py-1.5 px-1 text-gray-600 text-center max-md:hidden">{cell('tingling', key)}</td>
              <td className="py-1.5 px-1 text-gray-600 text-center max-md:hidden">{cell('numbness', key)}</td>
              <td className="py-1.5 pl-1 text-gray-700 text-center">{fmt(detailedCoverage[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2 italic">
        Combined is the union of all three symptom layers in that region, not the sum of the per-symptom values.
      </p>
    </div>
  );
}

/**
 * Render the human-readable summary for a single hand.
 *
 * Reads flags from result.flags (populated by useScoring from
 * analyzeSymptomDistribution).
 */
function KatzHandResult({ hand, result, isResultsDetailShown, volarRef, dorsalRef }) {
  const scoreColorClass =
    result.KatzScore.score === 3 ? 'bg-red-50 border border-red-200' :
    result.KatzScore.score === 2 ? 'bg-orange-50 border border-orange-200' :
    result.KatzScore.score === 1 ? 'bg-yellow-50 border border-yellow-200' :
    'bg-green-50 border border-green-200';

  const scoreTextClass =
    result.KatzScore.score === 3 ? 'text-red-700' :
    result.KatzScore.score === 2 ? 'text-orange-700' :
    result.KatzScore.score === 1 ? 'text-yellow-700' :
    'text-green-700';

  const flags = result.flags || {};
  const affectedDigitNames = [
    flags.thumbAffected && 'Thumb',
    flags.indexAffected && 'Index',
    flags.middleAffected && 'Middle',
  ].filter(Boolean);

  // Palm summary mirrors the precedence used in the classification:
  // ulnar-only is a meaningfully different finding from "any palm".
  let palmSummary;
  if (!flags.palmAffected?.any) {
    palmSummary = 'No';
  } else if (flags.palmAffected.confinedToUlnar) {
    palmSummary = 'Ulnar only';
  } else {
    palmSummary = 'Yes';
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6 results-block">
      <h4 className="text-lg font-bold text-gray-800 mb-4 capitalize">{hand} Hand</h4>

      <div className={`rounded-lg p-4 mb-4 ${scoreColorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xl font-bold ${scoreTextClass}`}>
            {result.KatzScore.classification}
          </span>
        </div>
        {isResultsDetailShown && (
          <p className="text-gray-600">{result.KatzScore.description}</p>
        )}
      </div>

      {/* Hand Diagrams */}
      <div className="flex gap-4 justify-center mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Palm</p>
          <canvas
            ref={volarRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border border-gray-300 rounded-lg bg-white"
            style={{ width: '120px', height: '160px' }}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Back</p>
          <canvas
            ref={dorsalRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border border-gray-300 rounded-lg bg-white"
            style={{ width: '120px', height: '160px' }}
          />
        </div>
      </div>

      {/* Summary Stats — driven by classification flags */}
      {isResultsDetailShown && (
        <div className="text-base space-y-1">
          <p>
            <span className="font-medium">Median digits affected:</span>{' '}
            {affectedDigitNames.length > 0 ? affectedDigitNames.join(', ') : 'None'}
          </p>
          <p>
            <span className="font-medium">Palm involvement:</span> {palmSummary}
          </p>
          <p>
            <span className="font-medium">Dorsum:</span>{' '}
            {flags.dorsumAffected ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-gray-500 mt-2 italic">
            A region is flagged as affected when symptom coverage exceeds {MIN_THRESHOLD}%.
            The middle segments of the index and middle fingers use a {HALF_THRESHOLD}% threshold instead.
          </p>
        </div>
      )}

      {/* Detailed Coverage */}
      {isResultsDetailShown && (
        <details className="mt-4">
          <summary className="cursor-pointer text-lg font-medium text-purple-600 hover:text-purple-800">
            View detailed coverage breakdown
          </summary>
          <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
            <CoverageTable result={result} />
          </div>
        </details>
      )}
    </div>
  );
}


/**
 * Export controls for the Results section footer.
 * Separated to keep the navigation area clean.
 */
export function ResultsExportControls({ exportActions }) {
  const { showDownloadMenu, handleExportJSON, handleExportCSV, handlePrint, handleToggleDownloadMenu, handleCloseDownloadMenu } = exportActions;

  const menuContainerRef = useRef(null);
  const menuId = 'results-download-menu';

  // Close on outside click or Escape, only while open.
  useEffect(() => {
    if (!showDownloadMenu) return;

    const handlePointerDown = (e) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target)
      ) {
        handleCloseDownloadMenu();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCloseDownloadMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDownloadMenu, handleCloseDownloadMenu]);
  
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Print button */}
      <button
        onClick={handlePrint}
        className="print-hide flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
      >
        <Printer className="w-5 h-5" />
        <span className="hidden sm:inline">Print Results</span>
        <span className="sm:hidden">Print</span>
      </button>

      {/* Download dropdown */}
      <div className="relative print-hide" ref={menuContainerRef}>
        <button
          onClick={handleToggleDownloadMenu}
          aria-haspopup="menu"
          aria-expanded={showDownloadMenu}
          aria-controls={menuId}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Download Results</span>
          <span className="sm:hidden">Download</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showDownloadMenu && (
          <div
            id={menuId}
            role="menu"
            aria-label="Download format"
            className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[240px]"
          >
            <button
              role="menuitem"
              onClick={handleExportJSON}
              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex flex-col gap-0.5"
            >
              <span className="font-medium">JSON — full record</span>
              <span className="text-sm text-gray-500">
                Includes raw stroke data (.json)
              </span>
            </button>
            <button
              role="menuitem"
              onClick={handleExportCSV}
              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex flex-col gap-0.5 border-t border-gray-100"
            >
              <span className="font-medium">CSV</span>
              <span className="text-sm text-gray-500">
                Flat tabular export (.csv)
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Back to top */}
      <button
        onClick={handleScrollToTop}
        className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-lg font-semibold bg-purple-400 text-white hover:bg-purple-500 transition-colors print-hide"
      >
        <ChevronsUp className="w-5 h-5" />
        <span className="hidden sm:inline">Back to top</span>
        <span className="sm:hidden">Top</span>
      </button>
    </div>
  );
}