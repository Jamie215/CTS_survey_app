"use client"

import React from 'react';
import { diagnosticQuestions } from '../../data/diagnosticQuestions';

/**
 * Diagnostic Questions section - renders the Kamath questionnaire.
 *
 * @param {Object} props
 * @param {Object} props.diagnosticAnswers
 * @param {Function} props.onAnswerChange
 * @param {boolean|null} props.hasNumbnessOrTingling
 * @param {Function} props.onNumbnessOrTinglingChange
 * @param {boolean} props.highlightIncomplete
 * @param {string} props.diagnosticEase
 * @param {Function} props.onDiagnosticEaseChange
 * @param {string} props.diagnosticComments
 * @param {Function} props.onDiagnosticCommentsChange
 */
export default function DiagnosticQuestions({
  diagnosticAnswers,
  onAnswerChange,
  hasNumbnessOrTingling,
  onNumbnessOrTinglingChange,
  highlightIncomplete,
  diagnosticEase,
  onDiagnosticEaseChange,
  diagnosticComments,
  onDiagnosticCommentsChange,
}) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div id="diagnostic-header">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Diagnostic Questions
        </h2>
        <p className="text-lg text-gray-600">
          Please answer the following questions as yes or no. We will ask about numbness which some people describe
          as having no feeling or dead feeling. We will also ask about tingling which some people call pins and needles or
          prickly feelings. Please pick the answer about how your hand has felt over the last month.
        </p>
      </div>

      {/* Questions Container */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="space-y-8">
          {diagnosticQuestions.map((question) => {
            if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === false) {
              return null;
            }
            if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === null && question.id !== 0) {
              return null;
            }
            if (question.requiresSplintTried && diagnosticAnswers[12] !== 'Yes') {
              return null;
            }

            const isIncomplete = highlightIncomplete && diagnosticAnswers[question.id] === undefined;
            const isSubQuestion = /[a-g]/.test(question.number);

            return (
              <div
                key={question.id}
                className={`${isSubQuestion ? 'ml-6' : ''} ${
                  isIncomplete ? 'bg-red-50 rounded-lg p-4 -mx-4 border border-red-300' : ''
                }`}
              >
                {isIncomplete && (
                  <p className="text-md font-medium text-red-800">This question is required.</p>
                )}

                <p className="text-lg font-medium mb-4 text-gray-800">
                  {question.number}. {question.text}
                  <span className="text-red-500 ml-1">*</span>
                </p>
                <div className="flex flex-wrap gap-6">
                  {['Yes', 'No'].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer group">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        diagnosticAnswers[question.id] === option
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-400 group-hover:border-purple-400'
                      }`}>
                        {diagnosticAnswers[question.id] === option && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={diagnosticAnswers[question.id] === option}
                        onChange={(e) => {
                          onAnswerChange(question.id, e.target.value);
                          if (question.hasNumbnessOrTingling) {
                            onNumbnessOrTinglingChange(option === 'Yes');
                          }
                        }}
                        className="sr-only"
                      />
                      <span className={`ml-2 text-lg font-medium ${
                        diagnosticAnswers[question.id] === option ? 'text-purple-600' : 'text-gray-600'
                      }`}>{option}</span>
                    </label>
                  ))}
                  {question.hasNotRelevant && (
                    <label className="flex items-center cursor-pointer group">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        diagnosticAnswers[question.id] === 'Not relevant'
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-400 group-hover:border-purple-400'
                      }`}>
                        {diagnosticAnswers[question.id] === 'Not relevant' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="Not relevant"
                        checked={diagnosticAnswers[question.id] === 'Not relevant'}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="sr-only"
                      />
                      <span className={`ml-2 text-lg font-medium ${
                        diagnosticAnswers[question.id] === 'Not relevant' ? 'text-purple-600' : 'text-gray-600'
                      }`}>Not relevant</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Feedback Section */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-lg font-medium mb-3 text-gray-800">
            Was it easy to answer these questions about your hand symptoms?
          </p>
          <div className="flex flex-wrap gap-4">
            {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
              <label key={option} className="flex items-center cursor-pointer group">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  diagnosticEase === option
                    ? 'border-purple-600 bg-purple-600'
                    : 'border-gray-400 group-hover:border-purple-400'
                }`}>
                  {diagnosticEase === option && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="diagnostic-ease"
                  value={option}
                  checked={diagnosticEase === option}
                  onChange={(e) => onDiagnosticEaseChange(e.target.value)}
                  className="sr-only"
                />
                <span className={`ml-2 text-lg ${
                  diagnosticEase === option ? 'text-purple-600 font-medium' : 'text-gray-600'
                }`}>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-800 mb-2">
            If you have any comments on how to improve the questions, please write them below:
          </label>
          <textarea
            value={diagnosticComments}
            onChange={(e) => onDiagnosticCommentsChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white"
            placeholder="Your feedback helps us improve the survey..."
          />
        </div>
      </div>
    </div>
  );
}
