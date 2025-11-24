"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand, Check, AlertCircle } from 'lucide-react';

const CTSSurveyApp = () => {
  // SVG dimensions from the hand SVG files
  const SVG_WIDTH = 300;
  const SVG_HEIGHT = 400;
  
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
  
  // SVG regions state
  const [svgRegions, setSvgRegions] = useState({
    leftFront: {},
    rightFront: {},
    leftBack: {},
    rightBack: {}
  });
  
  // SVG refs for drawing containers
  const svgRefs = {
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

      const svgFiles = [
        { path: '/hands/hand_front_left.svg', regions: leftFrontRegions, name: 'left front' },
        { path: '/hands/hand_front_right.svg', regions: rightFrontRegions, name: 'right front' },
        { path: '/hands/hand_back_left.svg', regions: leftBackRegions, name: 'left back' },
        { path: '/hands/hand_back_right.svg', regions: rightBackRegions, name: 'right back' }
      ];

      for (const { path, regions, name } of svgFiles) {
        const response = await fetch(path);
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = svgDoc.querySelectorAll('path[inkscape\\:label]');
        
        paths.forEach(path => {
          const label = path.getAttribute('inkscape:label');
          const d = path.getAttribute('d');
          
          if (label && d) {
            const path2D = new Path2D(d);
            regions[label] = {
              path: d,
              path2D: path2D,
              element: path
            };
          }
        });
      }

      setSvgRegions({
        leftFront: leftFrontRegions,
        rightFront: rightFrontRegions,
        leftBack: leftBackRegions,
        rightBack: rightBackRegions
      });

    } catch (error) {
      console.error('Error loading SVG regions:', error);
    }
  };

  // Drawing setup for SVG
  useEffect(() => {
    if (!isClient) return;

    const symptomColors = {
      tingling: '#FF0000',
      numbness: '#0000FF',
      pain: '#00FF00'
    };

    const setupDrawing = (svgElement, canvasKey, symptomColor) => {
      if (!svgElement) return;

      let isDrawing = false;
      let currentPath = null;
      let pathData = '';
      let drawingGroup = svgElement.querySelector('#drawingGroup');
      
      if (!drawingGroup) {
        drawingGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        drawingGroup.id = 'drawingGroup';
        svgElement.appendChild(drawingGroup);
      }

      const getMousePos = (e) => {
        const rect = svgElement.getBoundingClientRect();
        const viewBox = svgElement.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const startDrawing = (e) => {
        e.preventDefault();
        isDrawing = true;
        const pos = getMousePos(e);
        
        currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        currentPath.setAttribute('stroke', symptomColor);
        currentPath.setAttribute('stroke-width', '4');
        currentPath.setAttribute('fill', 'none');
        currentPath.setAttribute('stroke-linecap', 'round');
        currentPath.setAttribute('stroke-linejoin', 'round');
        currentPath.setAttribute('opacity', '0.7');
        
        pathData = `M ${pos.x} ${pos.y}`;
        currentPath.setAttribute('d', pathData);
        drawingGroup.appendChild(currentPath);
        
        // Store drawing data
        setHandDiagramData(prev => {
          const updated = {...prev};
          if (!updated[canvasKey]) {
            updated[canvasKey] = [];
          }
          updated[canvasKey] = [...updated[canvasKey], { type: 'start', x: pos.x, y: pos.y }];
          return updated;
        });
      };

      const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        pathData += ` L ${pos.x} ${pos.y}`;
        currentPath.setAttribute('d', pathData);
        
        setHandDiagramData(prev => {
          const updated = {...prev};
          if (updated[canvasKey]) {
            updated[canvasKey] = [...updated[canvasKey], { type: 'draw', x: pos.x, y: pos.y }];
          }
          return updated;
        });
      };

      const stopDrawing = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        currentPath = null;
        pathData = '';
        
        setHandDiagramData(prev => {
          const updated = {...prev};
          if (updated[canvasKey]) {
            updated[canvasKey] = [...updated[canvasKey], { type: 'end' }];
          }
          return updated;
        });
      };

      // Mouse events
      svgElement.addEventListener('mousedown', startDrawing);
      svgElement.addEventListener('mousemove', draw);
      svgElement.addEventListener('mouseup', stopDrawing);
      svgElement.addEventListener('mouseleave', stopDrawing);
      
      // Touch events
      svgElement.addEventListener('touchstart', startDrawing);
      svgElement.addEventListener('touchmove', draw);
      svgElement.addEventListener('touchend', stopDrawing);

      return () => {
        svgElement.removeEventListener('mousedown', startDrawing);
        svgElement.removeEventListener('mousemove', draw);
        svgElement.removeEventListener('mouseup', stopDrawing);
        svgElement.removeEventListener('mouseleave', stopDrawing);
        svgElement.removeEventListener('touchstart', startDrawing);
        svgElement.removeEventListener('touchmove', draw);
        svgElement.removeEventListener('touchend', stopDrawing);
      };
    };

    const cleanups = [];
    Object.entries(svgRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const symptomType = key.replace(/Front|Back|Left|Right/g, '').toLowerCase();
        const cleanup = setupDrawing(ref.current, key, symptomColors[symptomType]);
        if (cleanup) cleanups.push(cleanup);
      }
    });

    return () => {
      cleanups.forEach(cleanup => cleanup && cleanup());
    };
  }, [isClient, currentSection]);

  const clearCanvas = (canvasKey) => {
    const svgElement = svgRefs[canvasKey]?.current;
    if (svgElement) {
      const drawingGroup = svgElement.querySelector('#drawingGroup');
      if (drawingGroup) {
        while (drawingGroup.firstChild) {
          drawingGroup.removeChild(drawingGroup.firstChild);
        }
      }
    }
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: []
    }));
  };

  // Calculate CTS scores using Katz Hand Diagram method
  const calculateCTSScores = () => {
    const scores = { left: null, right: null };
    
    ['left', 'right'].forEach(hand => {
      // Collect all unique regions affected across all symptoms
      const unionAreas = new Set();
      const symptomRegions = {
        tingling: new Set(),
        numbness: new Set(),
        pain: new Set()
      };

      ['tingling', 'numbness', 'pain'].forEach(symptomType => {
        ['Front', 'Back'].forEach(side => {
          const svgKey = `${symptomType}${side}${hand.charAt(0).toUpperCase() + hand.slice(1)}`;
          const svgElement = svgRefs[svgKey]?.current;
          const drawings = handDiagramData[svgKey] || [];

          if (svgElement && drawings.length > 0) {
            const regions = side === 'Front'
              ? (hand === 'left' ? svgRegions.leftFront : svgRegions.rightFront)
              : (hand === 'left' ? svgRegions.leftBack : svgRegions.rightBack);

            // Check each region for drawing overlap
            Object.entries(regions).forEach(([regionName, regionData]) => {
              if (!regionData.path2D) return;

              const hasDrawing = checkRegionHasDrawing(regionData.path2D, drawings);
              
              if (hasDrawing) {
                const fullRegionName = `${side}_${regionName}`;
                symptomRegions[symptomType].add(fullRegionName);
                unionAreas.add(fullRegionName);
              }
            });
          }
        });
      });

      // Apply Katz Hand Diagram scoring logic
      let katzScore = 0;
      let katzClassification = 'Unlikely';

      const volarRegions = Array.from(unionAreas).filter(r => r.startsWith('Front_'));
      const dorsalRegions = Array.from(unionAreas).filter(r => r.startsWith('Back_'));
      
      // Check specific volar digits (distal OR middle phalanx counts)
      const thumbVolar = volarRegions.some(r => 
        r.includes('thumb_distal') || r.includes('thumb_middle'));
      const indexVolar = volarRegions.some(r => 
        r.includes('index_distal') || r.includes('index_middle'));
      const middleVolar = volarRegions.some(r => 
        r.includes('middle_distal') || r.includes('middle_middle'));
      
      const volarDigitCount = [thumbVolar, indexVolar, middleVolar].filter(Boolean).length;
      
      // Check for palm and dorsum presence
      const hasPalm = volarRegions.some(r => 
        r.includes('palm_radial') || r.includes('palm_ulnar'));
      const hasUlnarPalm = volarRegions.some(r => r.includes('palm_ulnar'));
      const hasDorsum = dorsalRegions.length > 0;
      
      // Katz classification logic
      // Classic (3): Distal volar shading in at least 2 of thumb/index/middle, no palm, no dorsum
      if (volarDigitCount >= 2 && !hasPalm && !hasDorsum) {
        katzScore = 3;
        katzClassification = 'Classic';
      } 
      // Probable (2): Same as classic but may extend into palm (unless confined to ulnar side)
      else if (volarDigitCount >= 2 && (hasPalm && !hasUlnarPalm)) {
        katzScore = 2;
        katzClassification = 'Probable';
      } 
      // Possible (1): Volar shading in at least one of thumb/index/middle, may include dorsum
      else if (volarDigitCount >= 1) {
        katzScore = 1;
        katzClassification = 'Possible';
      } 
      // Unlikely (0): No volar thumb, index, or middle
      else {
        katzScore = 0;
        katzClassification = 'Unlikely';
      }

      scores[hand] = {
        katzScore,
        katzClassification,
        totalUniqueAreas: unionAreas.size,
        volarDigits: {
          thumb: thumbVolar,
          index: indexVolar,
          middle: middleVolar,
          count: volarDigitCount
        },
        regions: {
          palm: hasPalm,
          ulnarPalm: hasUlnarPalm,
          dorsum: hasDorsum,
          volar: volarRegions.length,
          dorsal: dorsalRegions.length
        },
        symptomBreakdown: {
          tingling: Array.from(symptomRegions.tingling),
          numbness: Array.from(symptomRegions.numbness),
          pain: Array.from(symptomRegions.pain)
        },
        affectedRegions: Array.from(unionAreas)
      };
    });
    
    return scores;
  };

  // Check if a region has any drawing in it
  const checkRegionHasDrawing = (path2D, drawings) => {
    if (!drawings || drawings.length === 0) return false;

    // Sample points from the drawings to see if they fall in the region
    let isDrawing = false;
    for (const point of drawings) {
      if (point.type === 'start') {
        isDrawing = true;
      } else if (point.type === 'end') {
        isDrawing = false;
      } else if (point.type === 'draw' && isDrawing) {
        // Check if this point is in the region using Path2D
        const ctx = document.createElement('canvas').getContext('2d');
        if (ctx.isPointInPath(path2D, point.x, point.y)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleDiagnosticAnswer = (questionId, answer) => {
    const newAnswers = { ...diagnosticAnswers, [questionId]: answer };
    setDiagnosticAnswers(newAnswers);

    if (questionId === 0) {
      setHasNumbnessOrTingling(answer === 'Yes');
    }
  };

  const getVisibleQuestions = () => {
    return diagnosticQuestions.filter(q => {
      if (q.requiresNumbnessOrTingling) {
        return hasNumbnessOrTingling === true;
      }
      return true;
    });
  };

  const isDiagnosticComplete = () => {
    const visibleQuestions = getVisibleQuestions();
    return visibleQuestions.every(q => {
      const answer = diagnosticAnswers[q.id];
      return answer && answer !== '';
    });
  };

  const isDiagramComplete = () => {
    const requiredKeys = [
      'tinglingFrontLeft', 'tinglingFrontRight',
      'numbnessFrontLeft', 'numbnessFrontRight',
      'painFrontLeft', 'painFrontRight'
    ];
    return requiredKeys.every(key => 
      handDiagramData[key] && handDiagramData[key].length > 0
    );
  };

  const canProceed = () => {
    if (currentSection === 0) {
      return isDiagnosticComplete();
    } else if (currentSection === 1) {
      return isDiagramComplete();
    }
    return true;
  };

  const handleNext = () => {
    if (canProceed()) {
      if (currentSection === 1) {
        const scores = calculateCTSScores();
        setCtsScores(scores);
      }
      setCurrentSection(prev => Math.min(prev + 1, sections.length - 1));
      setHighlightIncomplete(false);
    } else {
      setHighlightIncomplete(true);
    }
  };

  const handlePrevious = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
    setHighlightIncomplete(false);
  };

  const exportResults = () => {
    const results = {
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

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participantId}_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDiagnosticSection = () => {
    const visibleQuestions = getVisibleQuestions();
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Diagnostic Questions</h2>
        
        {visibleQuestions.map((q) => (
          <div 
            key={q.id} 
            className={`p-4 border rounded-lg ${
              highlightIncomplete && !diagnosticAnswers[q.id] 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200'
            }`}
          >
            <p className="mb-3 font-medium">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDiagnosticAnswer(q.id, 'Yes')}
                className={`px-6 py-2 rounded ${
                  diagnosticAnswers[q.id] === 'Yes'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => handleDiagnosticAnswer(q.id, 'No')}
                className={`px-6 py-2 rounded ${
                  diagnosticAnswers[q.id] === 'No'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                No
              </button>
              {q.hasNotRelevant && (
                <button
                  onClick={() => handleDiagnosticAnswer(q.id, 'Not Relevant')}
                  className={`px-6 py-2 rounded ${
                    diagnosticAnswers[q.id] === 'Not Relevant'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Not Relevant
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="mt-8 space-y-4">
          <div>
            <label className="block mb-2 font-medium">
              How easy was it to answer these questions?
            </label>
            <select
              value={diagnosticEase}
              onChange={(e) => setDiagnosticEase(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select...</option>
              <option value="very-easy">Very Easy</option>
              <option value="easy">Easy</option>
              <option value="neutral">Neutral</option>
              <option value="difficult">Difficult</option>
              <option value="very-difficult">Very Difficult</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Additional comments:
            </label>
            <textarea
              value={diagnosticComments}
              onChange={(e) => setDiagnosticComments(e.target.value)}
              className="w-full p-2 border rounded h-24"
              placeholder="Any additional feedback..."
            />
          </div>
        </div>
      </div>
    );
  };

  const renderHandDiagram = (symptomType, side, hand) => {
    const capitalizedHand = hand.charAt(0).toUpperCase() + hand.slice(1);
    const canvasKey = `${symptomType}${side}${capitalizedHand}`;
    const svgPath = `/hands/hand_${side.toLowerCase()}_${hand}.svg`;
    
    const symptomColors = {
      tingling: '#FF0000',
      numbness: '#0000FF',
      pain: '#00FF00'
    };

    return (
      <div className="relative" style={{ width: SVG_WIDTH, height: SVG_HEIGHT }}>
        <svg
          ref={svgRefs[canvasKey]}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          className="border border-gray-300 cursor-crosshair touch-none"
          style={{ 
            backgroundImage: `url(${svgPath})`,
            backgroundSize: 'cover'
          }}
        />
        <button
          onClick={() => clearCanvas(canvasKey)}
          className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Clear
        </button>
      </div>
    );
  };

  const renderDiagramSection = () => {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold mb-6">Hand Symptom Diagrams</h2>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Draw on each diagram to indicate where you experience each symptom</li>
            <li>Use your mouse or finger to draw on the hand diagrams</li>
            <li>Click "Clear" to restart a diagram</li>
          </ul>
        </div>

        {['tingling', 'numbness', 'pain'].map(symptomType => (
          <div key={symptomType} className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4 capitalize">
              {symptomType} - Mark all areas where you feel {symptomType}
            </h3>
            
            {['left', 'right'].map(hand => (
              <div key={hand} className="mb-6">
                <h4 className="text-lg font-medium mb-3 capitalize">{hand} Hand</h4>
                <div className="flex gap-6 flex-wrap">
                  <div>
                    <p className="text-sm mb-2">Palm Side (Front)</p>
                    {renderHandDiagram(symptomType, 'Front', hand)}
                  </div>
                  <div>
                    <p className="text-sm mb-2">Back Side</p>
                    {renderHandDiagram(symptomType, 'Back', hand)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="mt-8 space-y-4">
          <div>
            <label className="block mb-2 font-medium">
              How easy was it to complete the hand diagrams?
            </label>
            <select
              value={diagramEase}
              onChange={(e) => setDiagramEase(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select...</option>
              <option value="very-easy">Very Easy</option>
              <option value="easy">Easy</option>
              <option value="neutral">Neutral</option>
              <option value="difficult">Difficult</option>
              <option value="very-difficult">Very Difficult</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Additional comments about the diagrams:
            </label>
            <textarea
              value={diagramComments}
              onChange={(e) => setDiagramComments(e.target.value)}
              className="w-full p-2 border rounded h-24"
              placeholder="Any feedback about drawing the diagrams..."
            />
          </div>
        </div>
      </div>
    );
  };

  const renderResultsSection = () => {
    if (!ctsScores) return null;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-6">Assessment Results</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['left', 'right'].map(hand => {
            const score = ctsScores[hand];
            if (!score) return null;

            const getScoreColor = (classification) => {
              switch(classification) {
                case 'Classic': return 'bg-red-100 border-red-500';
                case 'Probable': return 'bg-orange-100 border-orange-500';
                case 'Possible': return 'bg-yellow-100 border-yellow-500';
                default: return 'bg-green-100 border-green-500';
              }
            };

            return (
              <div key={hand} className={`p-6 border-2 rounded-lg ${getScoreColor(score.katzClassification)}`}>
                <h3 className="text-xl font-bold mb-4 capitalize">{hand} Hand</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Katz Classification:</span>
                    <span className="text-lg font-bold">{score.katzClassification}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Score:</span>
                    <span className="text-lg font-bold">{score.katzScore}/3</span>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="font-semibold mb-2">Pattern Details:</p>
                    <ul className="text-sm space-y-1">
                      <li>Volar digits affected: {score.volarDigits.count}/3</li>
                      <li className="ml-4">
                        • Thumb: {score.volarDigits.thumb ? '✓' : '✗'}
                      </li>
                      <li className="ml-4">
                        • Index: {score.volarDigits.index ? '✓' : '✗'}
                      </li>
                      <li className="ml-4">
                        • Middle: {score.volarDigits.middle ? '✓' : '✗'}
                      </li>
                      <li>Palm involvement: {score.regions.palm ? 'Yes' : 'No'}</li>
                      <li>Dorsum involvement: {score.regions.dorsum ? 'Yes' : 'No'}</li>
                      <li>Total unique areas: {score.totalUniqueAreas}</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="font-semibold mb-2">Symptom Breakdown:</p>
                    <ul className="text-sm space-y-1">
                      <li>Tingling: {score.symptomBreakdown.tingling.length} regions</li>
                      <li>Numbness: {score.symptomBreakdown.numbness.length} regions</li>
                      <li>Pain: {score.symptomBreakdown.pain.length} regions</li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-gray-50 border rounded-lg">
          <h3 className="text-lg font-bold mb-3">Classification Guide:</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>Classic (3):</strong> Distal volar shading in at least 2 of thumb/index/middle digits, no palm or dorsum</li>
            <li><strong>Probable (2):</strong> Same as classic but may extend into palm (unless confined to ulnar side)</li>
            <li><strong>Possible (1):</strong> Volar shading in at least one of thumb/index/middle, may include dorsum</li>
            <li><strong>Unlikely (0):</strong> No volar shading of thumb, index, or middle fingers</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={exportResults}
            className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            <Download size={20} />
            Export Results
          </button>
        </div>
      </div>
    );
  };

  if (!isClient) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Carpal Tunnel Syndrome Assessment</h1>
        <p className="text-gray-600">Participant ID: {participantId}</p>
      </div>

      <div className="mb-6 flex gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              if (section.id < currentSection || canProceed()) {
                setCurrentSection(section.id);
                if (section.id === 2 && !ctsScores) {
                  setCtsScores(calculateCTSScores());
                }
              }
            }}
            className={`px-4 py-2 rounded ${
              currentSection === section.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {highlightIncomplete && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-400 rounded flex items-center gap-2">
          <AlertCircle className="text-yellow-600" />
          <span>Please complete all required fields before proceeding.</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {currentSection === 0 && renderDiagnosticSection()}
        {currentSection === 1 && renderDiagramSection()}
        {currentSection === 2 && renderResultsSection()}
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentSection === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        {currentSection < sections.length - 1 && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CTSSurveyApp;