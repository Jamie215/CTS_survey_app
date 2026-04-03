"use client"

import React from 'react';
import { CircleHelp, Waves, CircleX, Zap } from 'lucide-react';
import HandDiagramCanvas from '../HandDiagramCanvas';

/**
 * Hand Diagrams section - renders the drawing canvases for each symptom.
 *
 * @param {Object} props
 * @param {boolean|null} props.hasNumbnessOrTingling
 * @param {Object} props.canvasRefs
 * @param {Function} props.onPointerDown
 * @param {Function} props.onPointerMove
 * @param {Function} props.onPointerUp
 * @param {Function} props.onClearCanvas
 * @param {Function} props.onHelpClick
 * @param {string} props.diagramEase
 * @param {Function} props.onDiagramEaseChange
 * @param {string} props.diagramComments
 * @param {Function} props.onDiagramCommentsChange
 */
export default function HandDiagrams({
  hasNumbnessOrTingling,
  canvasRefs,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClearCanvas,
  onHelpClick,
  diagramEase,
  onDiagramEaseChange,
  diagramComments,
  onDiagramCommentsChange,
}) {
  const allSymptoms = [
    { type: 'pain', label: 'Pain', color: 'orange', icon: Zap, instruction: 'Mark areas where you experience pain or discomfort. You will see orange shading' },
    { type: 'tingling', label: 'Tingling', color: 'purple', icon: Waves, instruction: 'Mark areas where you feel pins and needles or tingling sensations. You will see purple shading' },
    { type: 'numbness', label: 'Numbness', color: 'blue', icon: CircleX, instruction: 'Mark areas where you have reduced or no sensation. You will see blue shading' },
  ];

  const symptoms = hasNumbnessOrTingling === false
    ? allSymptoms.filter(s => s.type === 'pain')
    : allSymptoms;

  return (
    <div className="space-y-6">
      <div className="mb-6" id="hand-diagram-header">
        <div className="flex gap-2 items-start">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            Hand Diagrams
          </h2>
          <button onClick={onHelpClick} className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <CircleHelp className="w-5 h-5" />
          </button>
        </div>
        <p className="text-lg text-gray-600">
          {hasNumbnessOrTingling === false
            ? 'Please mark the areas where you experience pain on the corresponding hand diagrams below.'
            : 'Please mark the areas where you experience each symptom (pain, tingling, numbness) on the corresponding hand diagrams below.'}
        </p>
      </div>

      {symptoms.map((symptom) => (
        <div key={symptom.type} id={`symptom-section-${symptom.type}`} className="bg-gray-50 rounded-xl p-6">
          <div className="mb-6">
            <h3 className={`text-xl font-bold flex items-center gap-2 ${
              symptom.type === 'tingling' ? 'text-purple-600' :
              symptom.type === 'numbness' ? 'text-blue-600' : 'text-orange-600'
            }`}>
              <symptom.icon className="w-5 h-5 inline" /> {symptom.label}
            </h3>
            <p className="text-lg text-gray-600 mt-1 italic">{symptom.instruction}</p>
          </div>

          {/* Palm View */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-700 mb-4">Palm side:</h4>
            <div className="flex gap-8 justify-center flex-wrap">
              {['Left', 'Right'].map((side) => {
                const canvasKey = `${symptom.type}Front${side}`;
                return (
                  <HandDiagramCanvas
                    key={canvasKey}
                    id={`canvas-${canvasKey}`}
                    canvasKey={canvasKey}
                    label={`${side} Hand`}
                    canvasRef={canvasRefs[canvasKey]}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClear={onClearCanvas}
                  />
                );
              })}
            </div>
          </div>

          {/* Back View */}
          <div id={`back-view-section-${symptom.type}`}>
            <h4 className="text-lg font-medium text-gray-700 mb-4">Back of hands:</h4>
            <div className="flex gap-8 justify-center flex-wrap">
              {['Left', 'Right'].map((side) => {
                const canvasKey = `${symptom.type}Back${side}`;
                return (
                  <HandDiagramCanvas
                    key={canvasKey}
                    id={`canvas-${canvasKey}`}
                    canvasKey={canvasKey}
                    label={`${side} Hand`}
                    canvasRef={canvasRefs[canvasKey]}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClear={onClearCanvas}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Diagram Feedback */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-lg font-medium mb-3 text-gray-800">
            Was it easy to mark areas on the hand diagrams?
          </p>
          <div className="flex flex-wrap gap-4">
            {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
              <label key={option} className="flex items-center cursor-pointer group">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  diagramEase === option
                    ? 'border-purple-600 bg-purple-600'
                    : 'border-gray-400 group-hover:border-purple-400'
                }`}>
                  {diagramEase === option && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="diagram-ease"
                  value={option}
                  checked={diagramEase === option}
                  onChange={(e) => onDiagramEaseChange(e.target.value)}
                  className="sr-only"
                />
                <span className={`ml-2 text-lg ${
                  diagramEase === option ? 'text-purple-600 font-medium' : 'text-gray-600'
                }`}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-800 mb-2">
            If you have any comments on how to improve the hand diagrams, please write them below:
          </label>
          <textarea
            value={diagramComments}
            onChange={(e) => onDiagramCommentsChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white"
            placeholder="Your feedback helps us improve this survey..."
          />
        </div>
      </div>
    </div>
  );
}
