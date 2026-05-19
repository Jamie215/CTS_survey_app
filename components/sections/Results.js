"use client"

import React from 'react';
import { AlertCircle, ChartBarBig, Download, ChevronsUp, ChevronRight, Printer } from 'lucide-react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, KAMATH_COLORS } from '../../data/constants';
import { diagnosticQuestions } from '../../data/diagnosticQuestions';

/**
 * Results section - displays Kamath and Katz scoring results.
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
  const { showDownloadMenu, handleExportJSON, handleExportCSV, handlePrint, handleToggleDownloadMenu } = exportActions;

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

      {/* KAMATH SCORE */}
      {assessmentResults?.kamath && (
        <KamathScoreCard
          kamath={assessmentResults.kamath}
          isResultsDetailShown={isResultsDetailShown}
        />
      )}

      {/* KATZ SCORE */}
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
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print-hide backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg mx-4 text-center">
        <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <ChartBarBig className="w-7 h-7 text-purple-600" />
        </div>
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
      </div>
    </div>
  );
}

function KamathScoreCard({ kamath, isResultsDetailShown }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Likelihood of CTS based on the Questionnaire</h3>
        <p className="text-sm text-gray-600 mt-1">Questionnaire-based assessment adapted from Kamath & Stothard (2003)</p>
      </div>

      <div className={`p-6 ${KAMATH_COLORS[kamath.colorClass].bg}`}>
        <div className="flex items-center justify-between mb-4">
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

        {isResultsDetailShown && (
          <div className="flex gap-4 text-sm py-3 border-t border-gray-200">
            <span className="text-green-700 font-medium">● &lt;3: Unlikely CTS</span>
            <span className="text-yellow-700 font-medium">● 3-4: Possible CTS: Unclear</span>
            <span className="text-red-700 font-medium">● ≥5: Classic / Probable CTS</span>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Likelihood of CTS based on the Drawings</h3>
        <p className="text-sm text-gray-600 mt-1">Symptom distribution assessment adapted from Katz et al. (1990)</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

  return (
    <div className="bg-gray-50 rounded-xl p-6">
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

      {/* Summary Stats */}
      {isResultsDetailShown && (
        <div className="text-base space-y-1">
          <p>
            <span className="font-medium">Median digits affected:</span>{' '}
            {result.KatzScore.coverageBySymptom ?
              [
                result.detailedCoverage?.thumb_distal > 5 && 'Thumb',
                result.detailedCoverage?.index_distal > 5 && 'Index',
                result.detailedCoverage?.middle_distal > 5 && 'Middle'
              ].filter(Boolean).join(', ') || 'None'
              : 'None'}
          </p>
          <p>
            <span className="font-medium">Palm involvement:</span>{' '}
            {result.detailedCoverage?.palm_radial > 5 || result.detailedCoverage?.palm_ulnar > 5
              ? (result.detailedCoverage?.palm_ulnar > 5 && !(result.detailedCoverage?.palm_radial > 5)
                  ? 'Ulnar only'
                  : 'Yes')
              : 'No'}
          </p>
          <p>
            <span className="font-medium">Dorsum:</span>{' '}
            {result.detailedCoverage?.dorsum > 5 ? 'Yes' : 'No'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
              <CoverageBlock
                title="Thumb (Distal)"
                coverageBySymptom={result.KatzScore.coverageBySymptom}
                region="thumb_distal"
              />
              <CoverageBlock
                title="Index (Distal/Middle)"
                coverageBySymptom={result.KatzScore.coverageBySymptom}
                region="index"
                isDualRegion
              />
              <CoverageBlock
                title="Middle (Distal/Middle)"
                coverageBySymptom={result.KatzScore.coverageBySymptom}
                region="middle"
                isDualRegion
              />
              <div>
                <p className="font-medium text-gray-700 mb-1">Palm & Dorsum</p>
                <div className="text-gray-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Palm (Radial):</span>
                    <span>{(result.detailedCoverage?.palm_radial || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Palm (Ulnar):</span>
                    <span>{(result.detailedCoverage?.palm_ulnar || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dorsum:</span>
                    <span>{(result.detailedCoverage?.dorsum || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function CoverageBlock({ title, coverageBySymptom, region, isDualRegion = false }) {
  return (
    <div>
      <p className="font-medium text-gray-700 mb-1">{title}</p>
      {['pain', 'tingling', 'numbness'].map(symptom => {
        if (isDualRegion) {
          const distal = coverageBySymptom?.[symptom]?.[`${region}_distal`] || 0;
          const middle = coverageBySymptom?.[symptom]?.[`${region}_middle`] || 0;
          return (
            <div key={symptom} className="flex justify-between text-gray-600">
              <span className="capitalize">{symptom}:</span>
              <span>{distal.toFixed(1)}% / {middle.toFixed(1)}%</span>
            </div>
          );
        }
        const coverage = coverageBySymptom?.[symptom]?.[region] || 0;
        return (
          <div key={symptom} className="flex justify-between text-gray-600">
            <span className="capitalize">{symptom}:</span>
            <span>{coverage.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Export controls for the Results section footer.
 * Separated to keep the navigation area clean.
 */
export function ResultsExportControls({ exportActions }) {
  const { showDownloadMenu, handleExportJSON, handleExportCSV, handlePrint, handleToggleDownloadMenu } = exportActions;

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
      <div className="relative print-hide">
        <button
          onClick={handleToggleDownloadMenu}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Download Results</span>
          <span className="sm:hidden">Download</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-90' : ''}`} />
        </button>
        {showDownloadMenu && (
          <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[200px]">
            <button
              onClick={handleExportJSON}
              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center gap-2"
            >
              <span className="font-medium">JSON</span>
              <span className="text-sm text-gray-500">(.json)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center gap-2 border-t border-gray-100 print-hide"
            >
              <span className="font-medium">CSV</span>
              <span className="text-sm text-gray-500">(.csv)</span>
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