"use client"

import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand } from 'lucide-react';

const CTSSurveyApp = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [participantId] = useState(`CTS-${Date.now()}`);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({});
  const [diagnosticEase, setDiagnosticEase] = useState('');
  const [diagnosticComments, setDiagnosticComments] = useState('');
  const [handDiagramData, setHandDiagramData] = useState({});
  const [diagramEase, setDiagramEase] = useState('');
  const [diagramComments, setDiagramComments] = useState('');
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  
  const canvasRefs = {
    tinglingFrontLeft: useRef(null),
    tinglingFrontRight: useRef(null),
    tinglingBackLeft: useRef(null),
    tinglingBackRight: useRef(null),
    numbnessFrontLeft: useRef(null),
    numbnessFrontRight: useRef(null),
    numbnessBackLeft: useRef(null),
    numbnessBackRight: useRef(null),
    painFrontLeft: useRef(null),
    painFrontRight: useRef(null),
    painBackLeft: useRef(null),
    painBackRight: useRef(null),
  };

  const diagnosticQuestions = [
    { id: 1, text: "Do you wake up because of pain in your wrist?" },
    { id: 2, text: "Do you wake up because of tingling or numbness in your fingers?" },
    { id: 3, text: "Do you have tingling or numbness in your fingers when you first wake up?" },
    { id: 4, text: "Is your numbness or tingling mainly in your thumb, index, and/or middle finger?" },
    { id: 5, text: "Do you have any quick movements or positions that relieve your tingling or numbness?" },
    { id: 6, text: "Do you have numbness or tingling in your little (small/pinky) finger?" },
    { id: 7, text: "Do certain activities (for example, holding objects or repetitive finger movement) increase the numbness or tingling in your fingers?" },
    { id: 8, text: "Do you drop small objects like coins or a cup?" },
    { id: 9, text: "Do you often have neck pain?" },
    { id: 10, text: "Did you have numbness or tingling in your fingers when you were pregnant? (If relevant)", hasNotRelevant: true },
    { id: 11, text: "Do you have numbness or tingling in your toes?" },
    { id: 12, text: "Have your symptoms improved with using wrist support brace or splint? (If relevant)", hasNotRelevant: true }
  ];

  const sections = [
    { id: 0, title: "Diagnostic Questions", icon: Hand },
    { id: 1, title: "Hand Diagrams", icon: Hand }
  ];

  const drawHandOutline = (canvas, isLeft = false, isFront = true) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Load the appropriate hand image
    const img = new Image();
    const imagePath = isFront ? '/hand_front.png' : '/hand_back.png';
    
    img.onload = () => {
      // Calculate crop dimensions - assuming image has both hands side by side
      const sourceWidth = img.width / 2; // Half the image width
      const sourceHeight = img.height;
      
      // Determine source X position based on which hand we want
      // For front view: left hand is on the left side of image, right hand on right side
      // For back view: this might be reversed depending on your image
      const sourceX = isLeft ? 0 : sourceWidth;
      
      // Draw the cropped portion of the image
      ctx.drawImage(
        img,
        sourceX, 0, sourceWidth, sourceHeight, // Source crop area
        0, 0, canvas.width, canvas.height      // Destination area
      );
    };
    
    img.src = imagePath;
  };

  React.useEffect(() => {
    // Initialize all hand diagrams
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const isLeft = key.includes('Left');
        const isFront = key.includes('Front');
        drawHandOutline(ref.current, isLeft, isFront);
      }
    });
  }, [currentSection]);

  const handleCanvasMouseDown = (e, canvasKey) => {
    const canvas = e.target;
    canvas.isDrawing = true;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Store the drawing start point
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'start', x, y }]
    }));
  };

  const handleCanvasMouseMove = (e, canvasKey) => {
    const canvas = e.target;
    if (!canvas.isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Store the drawing data
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'draw', x, y }]
    }));
  };

  const handleCanvasMouseUp = (e, canvasKey) => {
    const canvas = e.target;
    canvas.isDrawing = false;
    
    // Store the drawing end point
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'end' }]
    }));
  };

  const clearCanvas = (canvasKey) => {
    const canvas = canvasRefs[canvasKey].current;
    if (canvas) {
      const isLeft = canvasKey.includes('Left');
      const isFront = canvasKey.includes('Front');
      drawHandOutline(canvas, isLeft, isFront);
      setHandDiagramData(prev => ({
        ...prev,
        [canvasKey]: []
      }));
    }
  };

  // Add validation functions
  const isCurrentSectionComplete = () => {
    switch (currentSection) {
      case 0: // Diagnostic Questions
        // Check if all diagnostic questions are answered
        const allQuestionsAnswered = diagnosticQuestions.every(question => 
          diagnosticAnswers[question.id] !== undefined && diagnosticAnswers[question.id] !== ''
        );
        // Also check if ease question is answered
        const easeAnswered = diagnosticEase !== '';
        return allQuestionsAnswered && easeAnswered;
      
      case 1: // Hand Diagrams
        // Check if diagram ease question is answered
        return diagramEase !== '';
      
      default:
        return true;
    }
  };

  const handleNextSection = () => {
    if (!isCurrentSectionComplete()) {
      setHighlightIncomplete(true);
      alert('Please complete all required fields highlighted in red before proceeding to the next section.');
      
      // Scroll to first incomplete question
      setTimeout(() => {
        const firstIncomplete = document.querySelector('.incomplete-question');
        if (firstIncomplete) {
          firstIncomplete.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }
    setHighlightIncomplete(false);
    setCurrentSection(Math.min(sections.length - 1, currentSection + 1));
  };

  const handleDiagnosticAnswer = (questionId, value) => {
    setDiagnosticAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    // Remove highlighting when user starts answering
    setHighlightIncomplete(false);
  };

  const exportData = () => {
    const surveyData = {
      participantId,
      diagnosticAnswers,
      diagnosticEase,
      diagnosticComments,
      handDiagramData,
      diagramEase,
      diagramComments,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(surveyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cts-survey-${participantId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Hand className="w-8 h-8 text-blue-600" />
                Diagnostic Questionnaire
              </h2>
              <div className="bg-blue-600 text-white p-4 rounded-lg">
                <p className="text-m leading-relaxed">
                  <strong>Instructions:</strong> Please answer the following questions as yes or no. 
                  We will ask about numbness which some people describe as having no feeling or dead feeling. 
                  We will also ask about tingling which some people call pins and needles or prickly feelings. 
                  Please pick the answer about how your hand has felt over the last month.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              {diagnosticQuestions.map((question) => {
                const isAnswered = diagnosticAnswers[question.id] !== undefined && diagnosticAnswers[question.id] !== '';
                const shouldHighlight = highlightIncomplete && !isAnswered;
                
                return (
                  <div 
                    key={question.id} 
                    className={`${shouldHighlight ? 'incomplete-question bg-red-50 border-red-500 shadow-red-200' : 'bg-white border-gray-200'} p-6 border-2 rounded-xl shadow-sm hover:shadow-md transition-all relative`}
                  >
                    {shouldHighlight && (
                      <div className="absolute -top-2 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        REQUIRED
                      </div>
                    )}
                    <p className={`font-semibold mb-4 text-lg leading-relaxed flex items-center gap-3 ${shouldHighlight ? 'text-red-600' : 'text-gray-800'}`}>
                      <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${isAnswered ? 'bg-green-500' : 'bg-red-500'} ${shouldHighlight ? 'animate-pulse' : ''}`}>
                        {isAnswered ? '✓' : '!'}
                      </span>
                      {question.id}. {question.text}
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="yes"
                          checked={diagnosticAnswers[question.id] === 'yes'}
                          onChange={() => handleDiagnosticAnswer(question.id, 'yes')}
                          className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                        />
                        <span className="ml-3 text-gray-700 group-hover:text-green-600 font-medium">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="no"
                          checked={diagnosticAnswers[question.id] === 'no'}
                          onChange={() => handleDiagnosticAnswer(question.id, 'no')}
                          className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 focus:ring-2"
                        />
                        <span className="ml-3 text-gray-700 group-hover:text-red-600 font-medium">No</span>
                      </label>
                      {question.hasNotRelevant && (
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="not-relevant"
                            checked={diagnosticAnswers[question.id] === 'not-relevant'}
                            onChange={() => handleDiagnosticAnswer(question.id, 'not-relevant')}
                            className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 focus:ring-2"
                          />
                          <span className="ml-3 text-gray-700 group-hover:text-gray-600 font-medium">Not relevant to me</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-xl border border-amber-200 space-y-6">
              <div className={`${highlightIncomplete && diagnosticEase === '' ? 'bg-red-50 border-red-500 border-2 rounded-lg p-4 relative' : ''}`}>
                {highlightIncomplete && diagnosticEase === '' && (
                  <div className="absolute -top-2 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    REQUIRED
                  </div>
                )}
                <p className={`font-semibold mb-4 text-lg flex items-center gap-3 ${highlightIncomplete && diagnosticEase === '' ? 'text-red-600' : 'text-gray-800'}`}>
                  <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${diagnosticEase !== '' ? 'bg-green-500' : 'bg-red-500'} ${highlightIncomplete && diagnosticEase === '' ? 'animate-pulse' : ''}`}>
                    {diagnosticEase !== '' ? '✓' : '!'}
                  </span>
                  Was it easy to answer these questions about your hand symptoms?
                </p>
                <div className="flex flex-wrap gap-6">
                  {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="diagnostic-ease"
                        value={option}
                        checked={diagnosticEase === option}
                        onChange={(e) => {
                          setDiagnosticEase(e.target.value);
                          setHighlightIncomplete(false);
                        }}
                        className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500 focus:ring-2"
                      />
                      <span className="ml-3 text-gray-700 group-hover:text-amber-600 font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  If you have any comments on how to improve the questions, please write them below:
                </label>
                <textarea
                  value={diagnosticComments}
                  onChange={(e) => setDiagnosticComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Your feedback helps us improve this survey..."
                />
              </div>
              
              {!isCurrentSectionComplete() && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  <p className="font-semibold flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Please complete all required fields
                  </p>
                  <p className="text-sm mt-1">
                    You must answer all diagnostic questions and the ease rating question before proceeding to the next section.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-xl border border-purple-200">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Hand className="w-8 h-8 text-purple-600" />
                Hand Diagrams
              </h2>
              <p className="text-gray-700 bg-purple-600 text-white p-4 rounded-lg">
                Click and drag on the hand diagrams below to mark areas where you experience symptoms.
              </p>
            </div>
            
            {[
              { type: 'tingling', label: 'TINGLING (pins and needles sensation)', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
              { type: 'numbness', label: 'NUMBNESS (no feeling or dead feeling)', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
              { type: 'pain', label: 'PAIN', color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
            ].map((symptom) => (
              <div key={symptom.type} className={`${symptom.bgColor} ${symptom.borderColor} border-2 rounded-xl p-6 space-y-6`}>
                <h3 className="text-2xl font-bold text-gray-800 text-center">
                  By shading the hand diagram below, please show where you have experienced <span className="underline text-gray-900">{symptom.label}</span> in the last month
                </h3>
                
                {/* Front view */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-xl font-semibold mb-6 text-center text-gray-800">Front of hands/fingers:</h4>
                  <div className="flex gap-12 justify-center items-start">
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg text-gray-700">Left Hand</p>
                      <div className="relative">
                        <canvas
                          ref={canvasRefs[`${symptom.type}FrontLeft`]}
                          width={300}
                          height={400}
                          className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg transition-shadow bg-white"
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontLeft`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontLeft`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                        />
                      </div>
                      <button
                        onClick={() => clearCanvas(`${symptom.type}FrontLeft`)}
                        className="mt-4 px-6 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg text-gray-700">Right Hand</p>
                      <div className="relative">
                        <canvas
                          ref={canvasRefs[`${symptom.type}FrontRight`]}
                          width={300}
                          height={400}
                          className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg transition-shadow bg-white"
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontRight`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontRight`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                        />
                      </div>
                      <button
                        onClick={() => clearCanvas(`${symptom.type}FrontRight`)}
                        className="mt-4 px-6 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back view */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-xl font-semibold mb-6 text-center text-gray-800">Back of hands/fingers:</h4>
                  <div className="flex gap-12 justify-center items-start">
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg text-gray-700">Left Hand</p>
                      <div className="relative">
                        <canvas
                          ref={canvasRefs[`${symptom.type}BackLeft`]}
                          width={300}
                          height={400}
                          className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg transition-shadow bg-white"
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackLeft`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackLeft`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                        />
                      </div>
                      <button
                        onClick={() => clearCanvas(`${symptom.type}BackLeft`)}
                        className="mt-4 px-6 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg text-gray-700">Right Hand</p>
                      <div className="relative">
                        <canvas
                          ref={canvasRefs[`${symptom.type}BackRight`]}
                          width={300}
                          height={400}
                          className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg transition-shadow bg-white"
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackRight`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackRight`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                        />
                      </div>
                      <button
                        onClick={() => clearCanvas(`${symptom.type}BackRight`)}
                        className="mt-4 px-6 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200 space-y-6">
              <div>
                <p className="font-semibold text-gray-800 mb-4 text-lg">
                  Was it easy to answer the last six questions on the hand diagrams?
                </p>
                <div className="flex flex-wrap gap-6">
                  {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="diagram-ease"
                        value={option}
                        checked={diagramEase === option}
                        onChange={(e) => setDiagramEase(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                      />
                      <span className="ml-3 text-gray-700 group-hover:text-green-600 font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  If you have any comments on how to improve the hand diagrams, please write them below:
                </label>
                <textarea
                  value={diagramComments}
                  onChange={(e) => setDiagramComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Your feedback helps us improve the hand diagrams..."
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-100 p-8 rounded-xl border border-indigo-200 text-center">
              <h3 className="text-2xl font-bold text-indigo-800 mb-4">Survey Complete!</h3>
              <p className="text-indigo-700 mb-6 text-lg">
                Thank you for completing the Carpal Tunnel Syndrome diagnostic survey. 
                You can download your responses as a JSON file for your records.
              </p>
              <button
                onClick={exportData}
                className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                Download Survey Data
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

      return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-4">
            <Hand className="w-10 h-10 text-blue-600" />
            Carpal Tunnel Syndrome Diagnostic Tool
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Assessing clinical measurement properties, usability, and health literacy
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-10">
          {/* Main Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-10">
            {renderSection()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-12 pt-8 border-t border-gray-200">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all duration-200 font-semibold ${
                  currentSection === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <button
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1 }
                className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all duration-200 font-semibold ${
                  currentSection === sections.length - 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                }`}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTSSurveyApp;