"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand, Check, AlertCircle } from 'lucide-react';

const CTSSurveyApp = () => {
  // Canvas dimensions - using pre-split images that match exactly
  const CANVAS_WIDTH = 300;
  const CANVAS_HEIGHT = 400;
  
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
  const [katzScores, setKatzScores] = useState(null);
  const [hasNumbnessOrTingling, setHasNumbnessOrTingling] = useState(null);
  
  // SVG regions state
  const [svgRegions, setSvgRegions] = useState({
    leftFront: {},
    rightFront: {},
    leftBack: {},
    rightBack: {}
  });
  
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

  // Refs for results display - combined symptom canvases
  const resultsCanvasRefs = {
    combinedLeft: useRef(null),
    combinedRight: useRef(null),
  };

  const diagnosticQuestions = [
    { id: 0, text: "Do you ever have numbness and tingling in your fingers?", hasNumbnessOrTingling: false },
    { id: 1, text: "Do you wake up because of pain in your wrist?" },
    { id: 2, text: "Do you wake up because of tingling or numbness in your fingers?", requiresNumbnessOrTingling: true },
    { id: 3, text: "Do you have tingling or numbness in your fingers when you first wake up?", requiresNumbnessOrTingling: true },
    { id: 4, text: "Is your numbness or tingling mainly in your thumb, index, and/or middle finger?", requiresNumbnessOrTingling: true },
    { id: 5, text: "Do you have any quick movements or positions that relieve your tingling or numbness?", requiresNumbnessOrTingling: true },
    { id: 6, text: "Do you have numbness or tingling in your little (small/pinky) finger?", requiresNumbnessOrTingling: true },
    { id: 7, text: "Do certain activities (for example, holding objects or repetitive finger movement) increase the numbness or tingling in your fingers?", requiresNumbnessOrTingling: true },
    { id: 8, text: "Do you drop small objects like coins or a cup?" },
    { id: 9, text: "Do you often have neck pain?" },
    { id: 10, text: "Did you have numbness or tingling in your fingers when you were pregnant? (If relevant)", hasNotRelevant: true, requiresNumbnessOrTingling: true },
    { id: 11, text: "Do you have numbness or tingling in your toes?" },
    { id: 12, text: "Have your symptoms improved with using wrist support brace or splint? (If relevant)", hasNotRelevant: true }
  ];

  const sections = [
    { id: 0, title: "Page 1" },
    { id: 1, title: "Page 2" },
    { id: 2, title: "Results" },
  ];

  useEffect(() => {
    setIsClient(true);
    setParticipantId(`CTS-${Date.now()}`);
  }, []);
  
  useEffect(() => {
    if (isClient) {
      loadSVGRegions();
    }
  }, [isClient]);

  const loadSVGRegions = async () => {
    try {
      const leftFrontRegions = {};
      const rightFrontRegions = {};
      const leftBackRegions = {};
      const rightBackRegions = {};
      
      // Load all four SVGs
      const svgFiles = [
        { path: '/hands/hand_front_left.svg', regions: leftFrontRegions },
        { path: '/hands/hand_front_right.svg', regions: rightFrontRegions },
        { path: '/hands/hand_back_left.svg', regions: leftBackRegions },
        { path: '/hands/hand_back_right.svg', regions: rightBackRegions }
      ];
      
      for (const { path, regions } of svgFiles) {
        console.log(`Loading ${path}...`);
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status}`);
        }
        
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        
        if (svgDoc.querySelector('parsererror')) {
          throw new Error(`${path} parsing failed`);
        }
        
        const paths = svgDoc.querySelectorAll('path');
        console.log(`${path} paths found:`, paths.length);
        
        paths.forEach(pathElement => {
          const label = pathElement.getAttribute('inkscape:label') || 
                       pathElement.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                       pathElement.getAttribute('id');
          const d = pathElement.getAttribute('d');
          
          if (label && d) {
            const path2D = new Path2D(d);
            regions[label] = { path2D, pathString: d, label };
            console.log(`✓ Region: ${label}`);
          }
        });
      }
      
      setSvgRegions({
        leftFront: leftFrontRegions,
        rightFront: rightFrontRegions,
        leftBack: leftBackRegions,
        rightBack: rightBackRegions
      });
      
      // Redraw canvases
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
      console.error('❌ Failed to load SVG regions:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const drawHandOutline = (canvas, isLeft = true, isBack = false) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw hand outline based on which hand/side we're showing
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    
    const imgSrc = isBack 
      ? (isLeft ? '/hands/hand_back_left.svg' : '/hands/hand_back_right.svg')
      : (isLeft ? '/hands/hand_front_left.svg' : '/hands/hand_front_right.svg');
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imgSrc;
  };

  const initializeCanvases = () => {
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const canvas = ref.current;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const isLeft = key.includes('Left');
        const isBack = key.includes('Back');
        drawHandOutline(canvas, isLeft, isBack);
      }
    });
  };

  const handleDiagnosticAnswer = (questionId, answer) => {
    const newAnswers = { ...diagnosticAnswers, [questionId]: answer };
    setDiagnosticAnswers(newAnswers);
    
    if (questionId === 0) {
      setHasNumbnessOrTingling(answer === 'yes');
    }
  };

  const clearCanvas = (canvasRef) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const isLeft = Object.keys(canvasRefs).find(key => canvasRefs[key] === canvasRef).includes('Left');
      const isBack = Object.keys(canvasRefs).find(key => canvasRefs[key] === canvasRef).includes('Back');
      drawHandOutline(canvas, isLeft, isBack);
      
      const dataKey = Object.keys(canvasRefs).find(key => canvasRefs[key] === canvasRef);
      setHandDiagramData(prev => ({ ...prev, [dataKey]: null }));
    }
  };

  const handleDrawing = (canvasRef, e, color, symptomType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  };

  const saveCanvasState = (canvasRef) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataKey = Object.keys(canvasRefs).find(key => canvasRefs[key] === canvasRef);
    const imageData = canvas.toDataURL('image/png');
    setHandDiagramData(prev => ({ ...prev, [dataKey]: imageData }));
  };

  const handleCanvasMouseDown = (canvasRef, e, color, symptomType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e) => handleDrawing(canvasRef, e, color, symptomType);
    const handleMouseUp = () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      saveCanvasState(canvasRef);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    handleDrawing(canvasRef, e, color, symptomType);
  };

  // Katz-based scoring algorithm
  const calculateKatzScore = () => {
    const scores = { left: null, right: null };
    
    ['left', 'right'].forEach(hand => {
      // Get unique union of all symptom areas
      const unionAreas = new Set();
      const symptomDrawings = {
        tingling: new Set(),
        numbness: new Set(),
        pain: new Set()
      };
      
      // Collect drawn pixels for each symptom
      ['tingling', 'numbness', 'pain'].forEach(symptom => {
        ['Front', 'Back'].forEach(side => {
          const canvasKey = `${symptom}${side}${hand.charAt(0).toUpperCase() + hand.slice(1)}`;
          const canvas = canvasRefs[canvasKey]?.current;
          
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Get regions based on side
            const regions = side === 'Front' 
              ? (hand === 'left' ? svgRegions.leftFront : svgRegions.rightFront)
              : (hand === 'left' ? svgRegions.leftBack : svgRegions.rightBack);
            
            // Check each region for drawings
            Object.entries(regions).forEach(([regionName, regionData]) => {
              if (!regionData.path2D) return;
              
              let hasDrawing = false;
              
              // Sample points in the region to check for drawings
              for (let y = 0; y < canvas.height; y += 5) {
                for (let x = 0; x < canvas.width; x += 5) {
                  if (ctx.isPointInPath(regionData.path2D, x, y)) {
                    const index = (y * canvas.width + x) * 4;
                    const r = pixels[index];
                    const g = pixels[index + 1];
                    const b = pixels[index + 2];
                    const a = pixels[index + 3];
                    
                    // Check if pixel is colored (not background)
                    if (a > 0 && !(r > 240 && g > 240 && b > 240)) {
                      hasDrawing = true;
                      break;
                    }
                  }
                }
                if (hasDrawing) break;
              }
              
              if (hasDrawing) {
                symptomDrawings[symptom].add(`${side}_${regionName}`);
                unionAreas.add(`${side}_${regionName}`);
              }
            });
          }
        });
      });
      
      // Determine Katz classification based on drawn regions
      let score = 0;
      let classification = 'Unlikely';
      let details = {
        hasVolarThumb: false,
        hasVolarIndex: false,
        hasVolarMiddle: false,
        hasPalm: false,
        hasUlnarPalm: false,
        hasDorsum: false,
        hasWrist: false,
        affectedDigits: [],
        totalUniqueArea: unionAreas.size
      };
      
      // Check volar (front) digits
      const volarRegions = Array.from(unionAreas).filter(r => r.startsWith('Front_'));
      const dorsalRegions = Array.from(unionAreas).filter(r => r.startsWith('Back_'));
      
      // Check specific volar digits (distal or middle phalanx)
      const thumbVolar = volarRegions.some(r => 
        r.includes('thumb_distal') || r.includes('thumb_middle'));
      const indexVolar = volarRegions.some(r => 
        r.includes('index_distal') || r.includes('index_middle'));
      const middleVolar = volarRegions.some(r => 
        r.includes('middle_distal') || r.includes('middle_middle'));
      
      details.hasVolarThumb = thumbVolar;
      details.hasVolarIndex = indexVolar;
      details.hasVolarMiddle = middleVolar;
      
      if (thumbVolar) details.affectedDigits.push('thumb');
      if (indexVolar) details.affectedDigits.push('index');
      if (middleVolar) details.affectedDigits.push('middle');
      
      // Check for palm and dorsum
      details.hasPalm = volarRegions.some(r => 
        r.includes('palm_radial') || r.includes('palm_ulnar'));
      details.hasUlnarPalm = volarRegions.some(r => r.includes('palm_ulnar'));
      details.hasDorsum = dorsalRegions.length > 0;
      details.hasWrist = volarRegions.some(r => r.includes('wrist')) || 
                        dorsalRegions.some(r => r.includes('wrist'));
      
      // Apply Katz classification logic
      const volarDigitCount = [thumbVolar, indexVolar, middleVolar].filter(Boolean).length;
      
      if (volarDigitCount >= 2 && !details.hasPalm && !details.hasDorsum) {
        // Classic pattern
        score = 3;
        classification = 'Classic';
      } else if (volarDigitCount >= 2 && details.hasPalm && !details.hasUlnarPalm) {
        // Probable pattern
        score = 2;
        classification = 'Probable';
      } else if (volarDigitCount >= 1) {
        // Possible pattern
        score = 1;
        classification = 'Possible';
      } else {
        // Unlikely pattern
        score = 0;
        classification = 'Unlikely';
      }
      
      scores[hand] = {
        score,
        classification,
        details,
        symptomBreakdown: {
          tingling: Array.from(symptomDrawings.tingling),
          numbness: Array.from(symptomDrawings.numbness),
          pain: Array.from(symptomDrawings.pain)
        }
      };
    });
    
    return scores;
  };

  const handleNextSection = () => {
    if (currentSection === 0) {
      const unanswered = diagnosticQuestions
        .filter(q => !q.hasNotRelevant && (!hasNumbnessOrTingling || !q.requiresNumbnessOrTingling))
        .filter(q => diagnosticAnswers[q.id] === undefined);
      
      if (unanswered.length > 0) {
        setHighlightIncomplete(true);
        setTimeout(() => setHighlightIncomplete(false), 3000);
        return;
      }
      
      if (!diagnosticEase) {
        setHighlightIncomplete(true);
        setTimeout(() => setHighlightIncomplete(false), 3000);
        return;
      }
    }
    
    if (currentSection === 1) {
      if (!diagramEase) {
        setHighlightIncomplete(true);
        setTimeout(() => setHighlightIncomplete(false), 3000);
        return;
      }
      
      // Calculate Katz scores
      const scores = calculateKatzScore();
      setKatzScores(scores);
    }
    
    setCurrentSection(currentSection + 1);
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
  };

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
      katzScores
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participantId}_results.json`;
    a.click();
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Part 1: Diagnostic Questions</h2>
            <div className="space-y-6">
              {diagnosticQuestions.map((question) => {
                const isDisabled = question.requiresNumbnessOrTingling && !hasNumbnessOrTingling;
                const shouldShow = !question.requiresNumbnessOrTingling || hasNumbnessOrTingling;
                
                if (!shouldShow) return null;
                
                return (
                  <div 
                    key={question.id} 
                    className={`p-4 rounded-lg ${
                      highlightIncomplete && diagnosticAnswers[question.id] === undefined && !isDisabled
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-gray-50'
                    } ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <p className="mb-3 font-medium">{question.id + 1}. {question.text}</p>
                    <div className="flex gap-3">
                      {['yes', 'no'].map(answer => (
                        <button
                          key={answer}
                          onClick={() => !isDisabled && handleDiagnosticAnswer(question.id, answer)}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            diagnosticAnswers[question.id] === answer
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          } ${isDisabled ? 'cursor-not-allowed' : ''}`}
                        >
                          {answer.charAt(0).toUpperCase() + answer.slice(1)}
                        </button>
                      ))}
                      {question.hasNotRelevant && (
                        <button
                          onClick={() => handleDiagnosticAnswer(question.id, 'not_relevant')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            diagnosticAnswers[question.id] === 'not_relevant'
                              ? 'bg-gray-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Not Relevant
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className={`p-4 rounded-lg ${
                highlightIncomplete && !diagnosticEase ? 'bg-red-50 border-2 border-red-500' : 'bg-gray-50'
              }`}>
                <p className="mb-3 font-medium">How easy was it to complete this section?</p>
                <div className="flex gap-3">
                  {['very_easy', 'easy', 'neutral', 'difficult', 'very_difficult'].map(level => (
                    <button
                      key={level}
                      onClick={() => setDiagnosticEase(level)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        diagnosticEase === level
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {level.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="mb-3 font-medium">Comments (optional):</p>
                <textarea
                  value={diagnosticComments}
                  onChange={(e) => setDiagnosticComments(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Any additional comments about this section..."
                />
              </div>
            </div>
          </div>
        );

      case 1:
        if (!isClient) return null;
        
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Part 2: Hand Diagram</h2>
            <p className="mb-6 text-gray-600">
              Please draw on the hand diagrams below to indicate where you experience symptoms.
              Draw on both front and back views if needed.
            </p>
            
            {['tingling', 'numbness', 'pain'].map((symptom, symptomIndex) => (
              <div key={symptom} className="mb-10">
                <h3 className="text-xl font-semibold mb-4 capitalize flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full ${
                    symptom === 'tingling' ? 'bg-purple-500' :
                    symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                  }`} />
                  {symptom.charAt(0).toUpperCase() + symptom.slice(1)}
                </h3>
                
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h4 className="font-medium mb-3 text-center">Left Hand</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-center mb-2">Front (Palm)</p>
                        <div className="relative">
                          <canvas
                            ref={canvasRefs[`${symptom}FrontLeft`]}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="border-2 border-gray-300 rounded-lg cursor-crosshair"
                            style={{ width: '150px', height: '200px' }}
                            onMouseDown={(e) => handleCanvasMouseDown(
                              canvasRefs[`${symptom}FrontLeft`],
                              e,
                              symptom === 'tingling' ? '#9333ea' :
                              symptom === 'numbness' ? '#3b82f6' : '#f97316',
                              symptom
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}FrontLeft`])}
                            className="absolute top-2 right-2 bg-white px-2 py-1 text-xs rounded shadow hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-center mb-2">Back</p>
                        <div className="relative">
                          <canvas
                            ref={canvasRefs[`${symptom}BackLeft`]}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="border-2 border-gray-300 rounded-lg cursor-crosshair"
                            style={{ width: '150px', height: '200px' }}
                            onMouseDown={(e) => handleCanvasMouseDown(
                              canvasRefs[`${symptom}BackLeft`],
                              e,
                              symptom === 'tingling' ? '#9333ea' :
                              symptom === 'numbness' ? '#3b82f6' : '#f97316',
                              symptom
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}BackLeft`])}
                            className="absolute top-2 right-2 bg-white px-2 py-1 text-xs rounded shadow hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3 text-center">Right Hand</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-center mb-2">Front (Palm)</p>
                        <div className="relative">
                          <canvas
                            ref={canvasRefs[`${symptom}FrontRight`]}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="border-2 border-gray-300 rounded-lg cursor-crosshair"
                            style={{ width: '150px', height: '200px' }}
                            onMouseDown={(e) => handleCanvasMouseDown(
                              canvasRefs[`${symptom}FrontRight`],
                              e,
                              symptom === 'tingling' ? '#9333ea' :
                              symptom === 'numbness' ? '#3b82f6' : '#f97316',
                              symptom
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}FrontRight`])}
                            className="absolute top-2 right-2 bg-white px-2 py-1 text-xs rounded shadow hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-center mb-2">Back</p>
                        <div className="relative">
                          <canvas
                            ref={canvasRefs[`${symptom}BackRight`]}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="border-2 border-gray-300 rounded-lg cursor-crosshair"
                            style={{ width: '150px', height: '200px' }}
                            onMouseDown={(e) => handleCanvasMouseDown(
                              canvasRefs[`${symptom}BackRight`],
                              e,
                              symptom === 'tingling' ? '#9333ea' :
                              symptom === 'numbness' ? '#3b82f6' : '#f97316',
                              symptom
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}BackRight`])}
                            className="absolute top-2 right-2 bg-white px-2 py-1 text-xs rounded shadow hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className={`p-4 rounded-lg ${
              highlightIncomplete && !diagramEase ? 'bg-red-50 border-2 border-red-500' : 'bg-gray-50'
            }`}>
              <p className="mb-3 font-medium">How easy was it to complete this section?</p>
              <div className="flex gap-3">
                {['very_easy', 'easy', 'neutral', 'difficult', 'very_difficult'].map(level => (
                  <button
                    key={level}
                    onClick={() => setDiagramEase(level)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      diagramEase === level
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {level.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="mb-3 font-medium">Comments (optional):</p>
              <textarea
                value={diagramComments}
                onChange={(e) => setDiagramComments(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows="3"
                placeholder="Any additional comments about the hand diagrams..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-3xl font-bold mb-8">Katz Classification Results</h2>
            
            {katzScores && (
              <div className="space-y-8">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-gray-50 rounded-xl p-8">
                    <h3 className="text-2xl font-bold mb-6 capitalize flex items-center gap-3">
                      {hand} Hand
                      <span className={`px-4 py-2 rounded-lg text-white font-bold ${
                        katzScores[hand].classification === 'Classic' ? 'bg-red-600' :
                        katzScores[hand].classification === 'Probable' ? 'bg-orange-500' :
                        katzScores[hand].classification === 'Possible' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}>
                        {katzScores[hand].classification} (Score: {katzScores[hand].score})
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {/* Classification Details */}
                      <div className="bg-white rounded-lg p-6">
                        <h4 className="font-bold text-lg mb-4">Classification Criteria</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full ${
                              katzScores[hand].details.affectedDigits.length >= 2 ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span>Volar shading in ≥2 digits: {
                              katzScores[hand].details.affectedDigits.length >= 2 ? 'Yes' : 'No'
                            }</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full ${
                              !katzScores[hand].details.hasPalm ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span>No palm involvement: {
                              !katzScores[hand].details.hasPalm ? 'Yes' : 'No'
                            }</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full ${
                              !katzScores[hand].details.hasDorsum ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span>No dorsum involvement: {
                              !katzScores[hand].details.hasDorsum ? 'Yes' : 'No'
                            }</span>
                          </div>
                          
                          {katzScores[hand].details.hasPalm && (
                            <div className="flex items-center gap-2 ml-6">
                              <span className={`w-5 h-5 rounded-full ${
                                !katzScores[hand].details.hasUlnarPalm ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <span className="text-sm">Ulnar palm spared: {
                                !katzScores[hand].details.hasUlnarPalm ? 'Yes' : 'No'
                              }</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Affected Areas */}
                      <div className="bg-white rounded-lg p-6">
                        <h4 className="font-bold text-lg mb-4">Affected Areas</h4>
                        
                        <div className="space-y-2">
                          <p className="text-sm">
                            <strong>Volar Digits:</strong> {
                              katzScores[hand].details.affectedDigits.length > 0 
                                ? katzScores[hand].details.affectedDigits.map(d => 
                                    d.charAt(0).toUpperCase() + d.slice(1)
                                  ).join(', ')
                                : 'None'
                            }
                          </p>
                          
                          <p className="text-sm">
                            <strong>Palm:</strong> {
                              katzScores[hand].details.hasPalm ? 'Yes' : 'No'
                            }
                            {katzScores[hand].details.hasPalm && katzScores[hand].details.hasUlnarPalm && 
                              ' (including ulnar side)'}
                          </p>
                          
                          <p className="text-sm">
                            <strong>Dorsum:</strong> {
                              katzScores[hand].details.hasDorsum ? 'Yes' : 'No'
                            }
                          </p>
                          
                          <p className="text-sm">
                            <strong>Wrist:</strong> {
                              katzScores[hand].details.hasWrist ? 'Yes' : 'No'
                            }
                          </p>
                          
                          <p className="text-sm mt-3">
                            <strong>Total unique areas:</strong> {
                              katzScores[hand].details.totalUniqueArea
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Symptom Breakdown */}
                    <div className="mt-6 bg-white rounded-lg p-6">
                      <h4 className="font-bold text-lg mb-4">Symptom Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {['tingling', 'numbness', 'pain'].map(symptom => (
                          <div key={symptom}>
                            <h5 className={`font-medium mb-2 capitalize flex items-center gap-2`}>
                              <span className={`w-4 h-4 rounded-full ${
                                symptom === 'tingling' ? 'bg-purple-500' :
                                symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                              }`} />
                              {symptom}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {katzScores[hand].symptomBreakdown[symptom].length} regions
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Interpretation Guide */}
                <div className="bg-blue-50 rounded-xl p-6 mt-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                    Katz Classification Guide
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong className="text-red-600">Classic (3):</strong> Volar shading in ≥2 digits (thumb, index, middle), 
                      no palm or dorsum involvement
                    </div>
                    <div>
                      <strong className="text-orange-500">Probable (2):</strong> Same as classic but may extend into palm 
                      (unless confined to ulnar side)
                    </div>
                    <div>
                      <strong className="text-yellow-600">Possible (1):</strong> Volar shading in ≥1 digit (thumb, index, middle), 
                      may include dorsum
                    </div>
                    <div>
                      <strong className="text-green-600">Unlikely (0):</strong> No volar shading in thumb, index, or middle fingers
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-4">
            <Hand className="w-10 h-10 text-blue-600" />
            Carpal Tunnel Syndrome Diagnostic Tool (Katz Classification)
          </h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-xl shadow-lg p-6 h-fit">
            <h2 className="text-lg font-bold mb-4">Progress</h2>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    currentSection === index
                      ? 'bg-blue-100 text-blue-800'
                      : currentSection > index
                      ? 'bg-green-50 text-green-800'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="font-medium">{section.title}</span>
                  {currentSection > index && <Check className="w-4 h-4 ml-auto" />}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-10">
            {renderSection()}

            {/* Navigation */}
            <div className={`flex ${currentSection === 0 ? 'justify-end' : 'justify-between'} mt-12 pt-8 border-t border-gray-200`}>
              {currentSection > 0 && currentSection !== 2 && (
                <button
                  onClick={handlePreviousSection}
                  className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold bg-gray-600 text-white hover:bg-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
              )}

              {currentSection < sections.length - 1 && (
                <button
                  onClick={handleNextSection}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold ${
                    currentSection === 1
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {currentSection === 1 ? 'Calculate Katz Scores' : 'Next'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {currentSection === 2 && (
                <button
                  onClick={exportData}
                  className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Download className="w-5 h-5" />
                  Download Results
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTSSurveyApp;