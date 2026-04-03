"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Data
import { diagnosticQuestions } from '../data/diagnosticQuestions';
import { sections } from '../data/constants';

// Hooks
import { useCanvasDrawing } from '../hooks/useCanvasDrawing';
import { useTour } from '../hooks/useTour';
import { useScoring } from '../hooks/useScoring';
import { useExport } from '../hooks/useExport';

// Canvas utilities
import { drawSymptomsOnCanvas } from '../lib/canvasUtils';

// Section components
import DiagnosticQuestions from './sections/DiagnosticQuestions';
import HandDiagrams from './sections/HandDiagrams';
import Results, { ResultsExportControls } from './sections/Results';

const CTSSurveyApp = () => {
  // ============================================
  // STATE
  // ============================================
  const [currentSection, setCurrentSection] = useState(0);
  const [participantId, setParticipantId] = useState('');
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({});
  const [diagnosticEase, setDiagnosticEase] = useState('');
  const [diagnosticComments, setDiagnosticComments] = useState('');
  const [diagramEase, setDiagramEase] = useState('');
  const [diagramComments, setDiagramComments] = useState('');
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  const [hasNumbnessOrTingling, setHasNumbnessOrTingling] = useState(null);
  const [showResultsDetailsModal, setShowResultsDetailsModal] = useState(true);
  const [isResultsDetailShown, setIsResultsDetailShown] = useState(null);

  // ============================================
  // HOOKS
  // ============================================
  const {
    isClient,
    handDiagramData,
    svgRegions,
    canvasRefs,
    resultsCanvasRefs,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleClearCanvas,
  } = useCanvasDrawing(false, currentSection); // isTourActive passed below

  const { isTourActive, handleHelpClick } = useTour(currentSection, isClient, hasNumbnessOrTingling);

  const { assessmentResults, handleCalculateScores } = useScoring(
    diagnosticAnswers, hasNumbnessOrTingling, svgRegions, handDiagramData
  );

  const exportActions = useExport({
    participantId,
    diagnosticAnswers,
    diagnosticEase,
    diagnosticComments,
    handDiagramData,
    diagramEase,
    diagramComments,
    assessmentResults,
  });

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    setParticipantId(`CTS-${Date.now()}`);
  }, []);

  // Draw combined symptoms on results canvases
  useEffect(() => {
    if (currentSection === 2) {
      const timer = setTimeout(() => {
        ['Left', 'Right'].forEach(hand => {
          const volarRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar;
          drawSymptomsOnCanvas(volarRef.current, hand, false, handDiagramData);
          const dorsalRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal;
          drawSymptomsOnCanvas(dorsalRef.current, hand, true, handDiagramData);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentSection, handDiagramData, resultsCanvasRefs]);

  // ============================================
  // NAVIGATION (item #6: consistent handleX naming)
  // ============================================
  const handleNextSection = () => {
    if (currentSection === 0) {
      const visibleQuestions = diagnosticQuestions.filter(q => {
        if (q.requiresNumbnessOrTingling) {
          return hasNumbnessOrTingling === true;
        }
        return true;
      });

      const unanswered = visibleQuestions.filter(q => diagnosticAnswers[q.id] === undefined);

      if (unanswered.length > 0) {
        setHighlightIncomplete(true);
        setTimeout(() => {
          const element = document.querySelector(`[name="question-${unanswered[0].id}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }

    if (currentSection === 1) {
      handleCalculateScores();
    }

    setCurrentSection(currentSection + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerChange = (questionId, value) => {
    setDiagnosticAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // ============================================
  // RENDER SECTIONS
  // ============================================
  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <DiagnosticQuestions
            diagnosticAnswers={diagnosticAnswers}
            onAnswerChange={handleAnswerChange}
            hasNumbnessOrTingling={hasNumbnessOrTingling}
            onNumbnessOrTinglingChange={setHasNumbnessOrTingling}
            highlightIncomplete={highlightIncomplete}
            diagnosticEase={diagnosticEase}
            onDiagnosticEaseChange={setDiagnosticEase}
            diagnosticComments={diagnosticComments}
            onDiagnosticCommentsChange={setDiagnosticComments}
          />
        );
      case 1:
        return (
          <HandDiagrams
            hasNumbnessOrTingling={hasNumbnessOrTingling}
            canvasRefs={canvasRefs}
            onPointerDown={isTourActive ? () => {} : handleCanvasPointerDown}
            onPointerMove={isTourActive ? () => {} : handleCanvasPointerMove}
            onPointerUp={isTourActive ? () => {} : handleCanvasPointerUp}
            onClearCanvas={handleClearCanvas}
            onHelpClick={handleHelpClick}
            diagramEase={diagramEase}
            onDiagramEaseChange={setDiagramEase}
            diagramComments={diagramComments}
            onDiagramCommentsChange={setDiagramComments}
          />
        );
      case 2:
        return (
          <Results
            assessmentResults={assessmentResults}
            showResultsDetailsModal={showResultsDetailsModal}
            isResultsDetailShown={isResultsDetailShown}
            onSetResultsDetailShown={setIsResultsDetailShown}
            onCloseModal={() => setShowResultsDetailsModal(false)}
            resultsCanvasRefs={resultsCanvasRefs}
            exportActions={exportActions}
          />
        );
      default:
        return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-50 pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-normal text-gray-800">
            Carpal Tunnel Syndrome Diagnostic Tool
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                <div className="flex flex-col items-center w-48">
                  <span className={`text-lg font-medium mb-2 text-center ${
                    currentSection === index
                      ? 'text-purple-700'
                      : currentSection > index
                        ? 'text-purple-600'
                        : 'text-gray-500'
                  }`}>
                    {section.title}
                  </span>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl font-semibold border-2 ${
                    currentSection === index
                      ? 'border-purple-600 bg-white text-purple-600'
                      : currentSection > index
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-gray-300 bg-gray-100 text-gray-500'
                  }`}>
                    {currentSection > index ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>
                {index < sections.length - 1 && (
                  <div className="flex items-end pb-2 -mx-2">
                    <div className={`w-20 h-0.5 ${
                      currentSection > index ? 'bg-purple-600' : 'bg-gray-300'
                    }`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {renderSection()}

          {/* Navigation Buttons */}
          <div className={`flex ${currentSection === 0 ? 'justify-end' : 'justify-between'} mt-10 pt-6 border-t border-gray-200`}>
            {currentSection > 0 && currentSection !== 2 && (
              <button
                onClick={handlePreviousSection}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
            )}

            {currentSection < sections.length - 1 && (
              <button
                onClick={handleNextSection}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                {currentSection === 1 ? 'Calculate CTS Scores' : 'Next'}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {currentSection === 2 && (
              <ResultsExportControls exportActions={exportActions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTSSurveyApp;
