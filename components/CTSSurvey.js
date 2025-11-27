"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Check, Waves, CircleSlash, Zap } from 'lucide-react';

// Data imports
import { diagnosticQuestions } from '../data/diagnosticQuestions';
import { CANVAS_WIDTH, CANVAS_HEIGHT, sections, STROKE_COLORS, OVERLAY_COLORS } from '../data/constants';

// Scoring imports
import { calculateKatzScore, analyzeSymptomDistribution } from '../lib/katzScoring';

const CTSSurveyApp = () => {
  // ============================================
  // STATE
  // ============================================
  const [currentSection, setCurrentSection] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({});
  const [diagnosticEase, setDiagnosticEase] = useState('');
  const [diagnosticComments, setDiagnosticComments] = useState('');
  const [handDiagramData, setHandDiagramData] = useState({});
  const [diagramEase, setDiagramEase] = useState('');
  const [diagramComments, setDiagramComments] = useState('');
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  const [ctsScores, setCtsScores] = useState(null);
  const [hasNumbnessOrTingling, setHasNumbnessOrTingling] = useState(null);
  
  // Track drawing state with refs to avoid stale closures
  const isDrawingRef = useRef(false);
  const currentCanvasKeyRef = useRef(null);
  
  // SVG regions state
  const [svgRegions, setSvgRegions] = useState({
    leftFront: {},
    rightFront: {},
    leftBack: {},
    rightBack: {}
  });
  
  // Canvas refs for drawing
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

  // Refs for results display
  const resultsCanvasRefs = {
    combinedLeftVolar: useRef(null),
    combinedRightVolar: useRef(null),
    combinedLeftDorsal: useRef(null),
    combinedRightDorsal: useRef(null),
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    setIsClient(true);
    setParticipantId(`CTS-${Date.now()}`);
  }, []);
  
  useEffect(() => {
    if (isClient) {
      loadSVGRegions();
    }
  }, [isClient]);

  // Initialize canvases when component mounts
  useEffect(() => {
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const isLeft = key.includes('Left');
        const isBack = key.includes('Back');
        drawHandOutline(ref.current, isLeft, isBack);
      }
    });
  }, [isClient]);

  // Re-initialize canvases when navigating to hand diagram section
  useEffect(() => {
    if (currentSection === 1) {
      const timer = setTimeout(() => {
        Object.entries(canvasRefs).forEach(([key, ref]) => {
          if (ref.current) {
            const isLeft = key.includes('Left');
            const isBack = key.includes('Back');
            const existingData = handDiagramData[key];
            
            drawHandOutline(ref.current, isLeft, isBack);
            
            if (existingData && existingData.length > 0) {
              setTimeout(() => {
                redrawStrokes(ref.current, existingData, getSymptomType(key));
              }, 150);
            }
          }
        });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentSection]);

  // Re-initialize results canvases when navigating to Results section
  useEffect(() => {
    if (currentSection === 2) {
      const timer = setTimeout(() => {
        drawCombinedSymptoms();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentSection]);

  // ============================================
  // SVG LOADING
  // ============================================
  const loadSVGRegions = async () => {
    try {
      const leftFrontRegions = {};
      const rightFrontRegions = {};
      const leftBackRegions = {};
      const rightBackRegions = {};

      const svgFiles = [
        { path: '/hands/hand_front_left.svg', regions: leftFrontRegions, name: 'left front' },
        { path: '/hands/hand_front_right.svg', regions: rightFrontRegions, name: 'right front' },
        { path: '/hands/hand_back_left.svg', regions: leftBackRegions, name: 'left back' },
        { path: '/hands/hand_back_right.svg', regions: rightBackRegions, name: 'right back' }
      ];

      for (const { path, regions, name } of svgFiles) {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${path} - ${response.status}`);
        }
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        if (svgDoc.querySelector('parsererror')) {
          throw new Error(`SVG parsing failed for file: ${path}`);
        }

        const paths = svgDoc.querySelectorAll('path');
        paths.forEach(pathEl => {
          const label = pathEl.getAttribute('inkscape:label') ||
                        pathEl.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                        pathEl.getAttribute('id');
          const d = pathEl.getAttribute('d'); 
          if (label && d) {
            const path2D = new Path2D(d);
            regions[label] = { path2D, pathString: d, label };
          }
        });
      }

      setSvgRegions({
        leftFront: leftFrontRegions,
        rightFront: rightFrontRegions,
        leftBack: leftBackRegions,
        rightBack: rightBackRegions
      });

      setTimeout(() => {
        Object.entries(canvasRefs).forEach(([key, ref]) => {
          if (ref.current) {
            const isLeft = key.includes('Left');
            const isBack = key.includes('Back');
            drawHandOutline(ref.current, isLeft, isBack);
          }
        });
      }, 100);
    } catch (error) {
      console.error('Error loading SVG regions:', error);
    }
  };

  // ============================================
  // CANVAS DRAWING HELPERS
  // ============================================
  const drawHandOutline = (canvas, isLeft = false, isBack = false) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    let imagePath;
    if (isBack) {
      imagePath = isLeft ? '/hands/hand_back_left.png' : '/hands/hand_back_right.png';
    } else {
      imagePath = isLeft ? '/hands/hand_front_left.png' : '/hands/hand_front_right.png';
    }

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    
    img.onerror = () => {
      console.error('Failed to load hand image:', imagePath);
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(isBack ? 'Back View' : 'Palm View', canvas.width / 2, canvas.height / 2);
      ctx.fillText(isLeft ? '(Left Hand)' : '(Right Hand)', canvas.width / 2, canvas.height / 2 + 20);
    };
    
    img.src = imagePath;
  };

  const redrawStrokes = (canvas, data, symptomType) => {
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = STROKE_COLORS[symptomType];
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let isDrawing = false;
    data.forEach(point => {
      if (point.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        isDrawing = true;
      } else if (point.type === 'draw' && isDrawing) {
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else if (point.type === 'end') {
        isDrawing = false;
      }
    });
  };

  const clearCanvas = (canvasKey) => {
    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (canvas) {
      const isLeft = canvasKey.includes('Left');
      const isBack = canvasKey.includes('Back');
      drawHandOutline(canvas, isLeft, isBack);
      setHandDiagramData(prev => ({ ...prev, [canvasKey]: [] }));
    }
  };

  const getEventCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    
    return { x, y };
  };

  const getSymptomType = (canvasKey) => {
    if (canvasKey.startsWith('tingling')) return 'tingling';
    if (canvasKey.startsWith('numbness')) return 'numbness';
    if (canvasKey.startsWith('pain')) return 'pain';
    return 'unknown';
  };

  // ============================================
  // CANVAS EVENT HANDLERS
  // ============================================
  const handleCanvasMouseDown = (e, canvasKey) => {
    e.preventDefault();
    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    currentCanvasKeyRef.current = canvasKey;

    const { x, y } = getEventCoordinates(e, canvas);
    
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'start', x, y }]
    }));
    
    const ctx = canvas.getContext('2d');
    const symptomType = getSymptomType(canvasKey);
    ctx.fillStyle = STROKE_COLORS[symptomType];
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleCanvasMouseMove = (e, canvasKey) => {
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    
    e.preventDefault();
    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;

    const { x, y } = getEventCoordinates(e, canvas);
    
    const currentData = handDiagramData[canvasKey] || [];
    const lastPoint = currentData[currentData.length - 1];
    
    if (lastPoint && (lastPoint.type === 'start' || lastPoint.type === 'draw')) {
      const ctx = canvas.getContext('2d');
      const symptomType = getSymptomType(canvasKey);
      ctx.strokeStyle = STROKE_COLORS[symptomType];
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'draw', x, y }]
    }));
  };

  const handleCanvasMouseUp = (e, canvasKey) => {
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    
    e.preventDefault();
    isDrawingRef.current = false;
    currentCanvasKeyRef.current = null;
    
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'end' }]
    }));
  };

  const handleCanvasTouchStart = (e, canvasKey) => {
    e.preventDefault();
    handleCanvasMouseDown(e, canvasKey);
  };

  const handleCanvasTouchMove = (e, canvasKey) => {
    e.preventDefault();
    handleCanvasMouseMove(e, canvasKey);
  };

  const handleCanvasTouchEnd = (e, canvasKey) => {
    e.preventDefault();
    handleCanvasMouseUp(e, canvasKey);
  };

  // ============================================
  // SCORING & RESULTS
  // ============================================
  const calculateCTSScores = () => {
    const scores = {
      left: analyzeSingleHand('Left'),
      right: analyzeSingleHand('Right')
    };
    setCtsScores(scores);
    return scores;
  };

  const analyzeSingleHand = (hand) => {
    const symptoms = analyzeSymptomDistribution(hand, svgRegions, handDiagramData);
    
    return {
      KatzScore: {
        ...calculateKatzScore(symptoms),
        coverageBySymptom: symptoms.coverageBySymptom
      },
      detailedCoverage: symptoms.detailedCoverage
    };
  };

  const drawSymptomsOnCanvas = (canvas, hand, isBack) => {
    if (!canvas) return;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    
    const isLeft = hand === 'Left';
    drawHandOutline(canvas, isLeft, isBack);
    
    setTimeout(() => {
      ['tingling', 'numbness', 'pain'].forEach((symptom) => {
        const dataKey = isBack ? `${symptom}Back${hand}` : `${symptom}Front${hand}`;
        const data = handDiagramData[dataKey] || [];
        
        ctx.strokeStyle = OVERLAY_COLORS[symptom];
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let isDrawing = false;
        data.forEach(point => {
          if (point.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            isDrawing = true;
          } else if (point.type === 'draw' && isDrawing) {
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          } else if (point.type === 'end') {
            isDrawing = false;
          }
        });
      });
    }, 150);
  };

  const drawCombinedSymptoms = () => {
    ['Left', 'Right'].forEach(hand => {
      const volarRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar;
      drawSymptomsOnCanvas(volarRef.current, hand, false);
      
      const dorsalRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal;
      drawSymptomsOnCanvas(dorsalRef.current, hand, true);
    });
  };

  // ============================================
  // NAVIGATION
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
        setTimeout(() => setHighlightIncomplete(false), 3000);
        return;
      }      
    }
    
    if (currentSection === 1) {
      calculateCTSScores();
      drawCombinedSymptoms();
    }
    
    setCurrentSection(currentSection + 1);
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
  };

  // ============================================
  // EXPORT
  // ============================================
  const exportData = () => {
    const data = {
      participantId,
      timestamp: new Date().toISOString(),
      diagnosticAnswers,
      diagnosticEase,
      diagnosticComments,
      handDiagramData,
      diagramEase,
      diagramComments,
      ctsScores
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participantId}_results.json`;
    a.click();
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
          <div className="space-y-6">
            {/* Section Header */}
            <div>
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
              <div className="space-y-6">
                {diagnosticQuestions.map((question) => {
                  if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === false) {
                    return null;
                  }
                  if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === null && question.id !== 0) {
                    return null;
                  }

                  const isIncomplete = highlightIncomplete && diagnosticAnswers[question.id] === undefined;
                  const isSubQuestion = /[a-g]/.test(question.number);
                  
                  return (
                    <div
                      key={question.id}
                      className={`${isSubQuestion ? 'ml-6' : ''} ${
                        isIncomplete ? 'bg-red-50 rounded-lg p-3 -m-3 border border-red-300' : ''
                      }`}
                    >
                      <p className="text-lg font-medium mb-6 text-gray-800">
                        {question.number}. {question.text}
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
                                const newAnswers = { ...diagnosticAnswers, [question.id]: e.target.value };
                                setDiagnosticAnswers(newAnswers);
                                if (question.hasNumbnessOrTingling) {
                                  setHasNumbnessOrTingling(option === 'Yes');
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
                              onChange={(e) => setDiagnosticAnswers({ ...diagnosticAnswers, [question.id]: e.target.value })}
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
                        onChange={(e) => setDiagnosticEase(e.target.value)}
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
                  onChange={(e) => setDiagnosticComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white"
                  placeholder="Your feedback helps us improve the diagrams..."
                />
              </div>
            </div>
          </div>
        );
      
      case 1:
        const allSymptoms = [
          { type: 'tingling', label: 'Tingling', color: 'purple', icon: Waves, instruction: 'Mark areas where you feel pins and needles or tingling sensations. You will see purple shading' },
          { type: 'numbness', label: 'Numbness', color: 'blue', icon: CircleSlash, instruction: 'Mark areas where you have reduced or no sensation. You will see blue shading' },
          { type: 'pain', label: 'Pain', color: 'orange', icon: Zap, instruction: 'Mark areas where you experience pain or discomfort. You will see orange shading' }
        ];
        
        const symptoms = hasNumbnessOrTingling === false
          ? allSymptoms.filter(s => s.type === 'pain')
          : allSymptoms;

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Hand Diagrams
              </h2>
              <p className="text-lg text-gray-600">
                Please mark the areas where you experience for each symptoms (tingling, numbness, pain) on the corresponding hand diagrams below. 
                Use your mouse or finger to draw on the hand images.
              </p>
            </div>

            {symptoms.map((symptom) => (
              <div key={symptom.type} className="bg-gray-50 rounded-xl p-6">
                <div className="mb-6">
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${
                    symptom.type === 'tingling' ? 'text-purple-600' :
                    symptom.type === 'numbness' ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    <symptom.icon className="w-5 h-5 inline" /> {symptom.label}
                  </h3>
                  <p className="text-lg text-gray-600 mt-1" style={{ fontStyle: 'italic' }}>{symptom.instruction}</p>
                </div>

                {/* Palm View */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Palm side:</h4>
                  <div className="flex gap-8 justify-center flex-wrap">
                    {['Left', 'Right'].map((side) => (
                      <div key={side} className="text-center">
                        <p className="mb-2 text-lg font-medium text-gray-700">{side} Hand</p>
                        <canvas
                          ref={canvasRefs[`${symptom.type}Front${side}`]}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                          style={{width: '200px', height: '267px'}}
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}Front${side}`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}Front${side}`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}Front${side}`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}Front${side}`)}
                          onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}Front${side}`)}
                          onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}Front${side}`)}
                          onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}Front${side}`)}
                        />
                        <button
                          onClick={() => clearCanvas(`${symptom.type}Front${side}`)}
                          className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Back View */}
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Back of hands:</h4>
                  <div className="flex gap-8 justify-center flex-wrap">
                    {['Left', 'Right'].map((side) => (
                      <div key={side} className="text-center">
                        <p className="mb-2 text-lg font-medium text-gray-700">{side} Hand</p>
                        <canvas
                          ref={canvasRefs[`${symptom.type}Back${side}`]}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                          style={{width: '200px', height: '267px'}}
                          onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}Back${side}`)}
                          onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}Back${side}`)}
                          onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}Back${side}`)}
                          onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}Back${side}`)}
                          onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}Back${side}`)}
                          onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}Back${side}`)}
                          onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}Back${side}`)}
                        />
                        <button
                          onClick={() => clearCanvas(`${symptom.type}Back${side}`)}
                          className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ))}
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
                        onChange={(e) => setDiagramEase(e.target.value)}
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
                  onChange={(e) => setDiagramComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white"
                  placeholder="Your feedback helps us improve this survey..."
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Results Summary
              </h2>
              <p className="text-lg text-gray-600">
                Based on your responses and hand diagram markings, here is your CTS assessment.
              </p>
            </div>

            {ctsScores && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize">{hand} Hand</h3>
                    
                    {/* Katz Score */}
                    <div className={`rounded-lg p-4 mb-4 ${
                      ctsScores[hand].KatzScore.score === 3 ? 'bg-red-50 border border-red-200' :
                      ctsScores[hand].KatzScore.score === 2 ? 'bg-orange-50 border border-orange-200' :
                      ctsScores[hand].KatzScore.score === 1 ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold">Katz Classification:</span>
                        <span className={`text-xl font-bold ${
                          ctsScores[hand].KatzScore.score === 3 ? 'text-red-600' :
                          ctsScores[hand].KatzScore.score === 2 ? 'text-orange-600' :
                          ctsScores[hand].KatzScore.score === 1 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {ctsScores[hand].KatzScore.classification}
                        </span>
                      </div>
                      <p className="text-gray-600">{ctsScores[hand].KatzScore.description}</p>
                    </div>

                    {/* Hand Diagrams */}
                    <div className="flex gap-4 justify-center mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Palm</p>
                        <canvas
                          ref={hand === 'left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="border border-gray-300 rounded-lg bg-white"
                          style={{width: '120px', height: '160px'}}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Back</p>
                        <canvas
                          ref={hand === 'left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="border border-gray-300 rounded-lg bg-white"
                          style={{width: '120px', height: '160px'}}
                        />
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="text-base space-y-1">
                      <p>
                        <span className="font-medium">Median digits affected:</span>{' '}
                        {ctsScores[hand].KatzScore.coverageBySymptom ? 
                          [
                            ctsScores[hand].detailedCoverage?.thumb_distal > 5 && 'Thumb',
                            ctsScores[hand].detailedCoverage?.index_distal > 5 && 'Index',
                            ctsScores[hand].detailedCoverage?.middle_distal > 5 && 'Middle'
                          ].filter(Boolean).join(', ') || 'None'
                          : 'None'}
                      </p>
                      <p>
                        <span className="font-medium">Palm involvement:</span>{' '}
                        {ctsScores[hand].detailedCoverage?.palm_radial > 5 || ctsScores[hand].detailedCoverage?.palm_ulnar > 5 
                          ? (ctsScores[hand].detailedCoverage?.palm_ulnar > 5 && !(ctsScores[hand].detailedCoverage?.palm_radial > 5)
                              ? 'Ulnar only' 
                              : 'Yes') 
                          : 'No'}
                      </p>
                      <p>
                        <span className="font-medium">Dorsum:</span>{' '}
                        {ctsScores[hand].detailedCoverage?.dorsum > 5 ? 'Yes' : 'No'}
                      </p>
                    </div>

                    {/* Detailed Coverage */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-lg font-medium text-purple-600 hover:text-purple-800">
                        View detailed coverage breakdown
                      </summary>
                      <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Thumb (Distal)</p>
                            {['tingling', 'numbness', 'pain'].map(symptom => {
                              const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['thumb_distal'] || 0;
                              return (
                                <div key={symptom} className="flex justify-between text-gray-600">
                                  <span className="capitalize">{symptom}:</span>
                                  <span>{coverage.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Index (Distal/Middle)</p>
                            {['tingling', 'numbness', 'pain'].map(symptom => {
                              const distal = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_distal'] || 0;
                              const middle = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_middle'] || 0;
                              return (
                                <div key={symptom} className="flex justify-between text-gray-600">
                                  <span className="capitalize">{symptom}:</span>
                                  <span>{distal.toFixed(1)}% / {middle.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Middle (Distal/Middle)</p>
                            {['tingling', 'numbness', 'pain'].map(symptom => {
                              const distal = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_distal'] || 0;
                              const middle = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_middle'] || 0;
                              return (
                                <div key={symptom} className="flex justify-between text-gray-600">
                                  <span className="capitalize">{symptom}:</span>
                                  <span>{distal.toFixed(1)}% / {middle.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Palm & Dorsum</p>
                            <div className="text-gray-600 space-y-0.5">
                              <div className="flex justify-between">
                                <span>Palm (Radial):</span>
                                <span>{(ctsScores[hand].detailedCoverage?.palm_radial || 0).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Palm (Ulnar):</span>
                                <span>{(ctsScores[hand].detailedCoverage?.palm_ulnar || 0).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Dorsum:</span>
                                <span>{(ctsScores[hand].detailedCoverage?.dorsum || 0).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTSSurveyApp;