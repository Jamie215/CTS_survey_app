"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand, Check, AlertCircle } from 'lucide-react';

const CTSSurveyApp = () => {
  // Canvas dimensions - maintain SVG aspect ratio to prevent distortion
  const CANVAS_WIDTH = 300;
  const SVG_HAND_WIDTH = 1048.5; // Half of 2097
  const SVG_HEIGHT = 847;
  const SVG_ASPECT_RATIO = SVG_HAND_WIDTH / SVG_HEIGHT; // ~1.238
  const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH / SVG_ASPECT_RATIO); // ~242
  
  const [currentSection, setCurrentSection] = useState(0);
  const [participantId] = useState(`CTS-${Date.now()}`);
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
    rightFront: {}
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

  const diagnosticQuestions = [
    { id: 0, text: "Do you ever have numbness and tingling in your finger?", isScreening: true },
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
    { id: 11, text: "Do you have numbness or tingling in your toes?", requiresNumbnessOrTingling: true },
    { id: 12, text: "Have your symptoms improved with using wrist support brace or splint? (If relevant)", hasNotRelevant: true }
  ];

  const sections = [
    { id: 0, title: "Page 1" },
    { id: 1, title: "Page 2" },
    { id: 2, title: "Results" },
  ];

  // Load SVG regions on mount
  useEffect(() => {
    loadSVGRegions();
  }, []);

  const loadSVGRegions = async () => {
    try {
      // Adjust path based on your setup
      const response = await fetch('/hands/hands_front.svg');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const svgText = await response.text();

      if (!svgText || svgText.length === 0) {
        throw new Error('SVG file is empty');
      }
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

      // Check for parsing errors
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG parsing failed: ' + parserError.textContent);
      }
      
      const paths = svgDoc.querySelectorAll('path');
      paths.forEach(path => {
        let label = path.getAttribute('inkscape:label') || 
                    path.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                    path.getAttribute('id');
      });
      
      if (paths.length === 0) {
        throw new Error('No labeled paths found in SVG. Make sure paths have inkscape:label attributes.');
      }
      
      console.log(`Found ${paths.length} labeled paths in SVG`);
      
      const leftRegions = {};
      const rightRegions = {};
      
      // Use uniform scale to prevent distortion
      const scale = CANVAS_WIDTH / SVG_HAND_WIDTH;
      const scaleX = scale;
      const scaleY = scale;
      
      console.log('SVG Scaling:', { 
        svgSize: `${SVG_HAND_WIDTH}×${SVG_HEIGHT}`,
        canvasSize: `${CANVAS_WIDTH}×${CANVAS_HEIGHT}`,
        scale: scale.toFixed(4),
        aspectRatio: SVG_ASPECT_RATIO.toFixed(3)
      });
      
      paths.forEach(path => {
        const label = path.getAttribute('inkscape:label');
        const d = path.getAttribute('d');
        
        if (label && d) {
          // Determine if left or right hand
          const isRight = label.includes('_R');
          const isLeft = label.includes('_L');
          
          if (isLeft || isRight) {
            // Scale and translate the path
            const offsetX = isRight ? SVG_HAND_WIDTH : 0;
            const scaledPath = scaleSVGPath(d, scaleX, scaleY, offsetX);
            const path2D = new Path2D(scaledPath);
            
            // Remove _L or _R suffix
            const regionName = label.replace(/_[LR]$/, '');
            
            if (isLeft) {
              leftRegions[regionName] = { path2D, pathString: scaledPath, label };
            } else if (isRight) {
              rightRegions[regionName] = { path2D, pathString: scaledPath, label };
            }
          }
        }
      });
      
      setSvgRegions({
        leftFront: leftRegions,
        rightFront: rightRegions
      });
      
      console.log('Loaded SVG regions:', { 
        left: Object.keys(leftRegions), 
        right: Object.keys(rightRegions) 
      });
      
      // Redraw canvases after regions are loaded
      setTimeout(() => {
        Object.entries(canvasRefs).forEach(([key, ref]) => {
          if (ref.current) {
            const isLeft = key.includes('Left');
            drawHandOutline(ref.current, isLeft);
          }
        });
      }, 100);
    } catch (error) {
      console.error('Failed to load SVG regions:', error);
    }
  };

  // Scale SVG path to canvas size - FIXED for proper right hand scaling
  const scaleSVGPath = (pathData, scaleX, scaleY, offsetX = 0) => {
    // Track position in path string and current command
    let result = '';
    let currentX = 0, currentY = 0;
    let currentCommand = '';
    
    // Split path into commands and coordinates
    const tokens = pathData.match(/[a-zA-Z]|[-]?[0-9]*\.?[0-9]+/g);
    
    if (!tokens) return pathData;
    
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      
      // Check if it's a command letter
      if (/[a-zA-Z]/.test(token)) {
        currentCommand = token;
        result += token;
        i++;
        
        // Process coordinates based on command type
        let coordCount = 0;
        switch (currentCommand.toUpperCase()) {
          case 'M': case 'L': case 'T':
            coordCount = 2; // x, y
            break;
          case 'H':
            coordCount = 1; // x only
            break;
          case 'V':
            coordCount = 1; // y only  
            break;
          case 'C':
            coordCount = 6; // x1, y1, x2, y2, x, y
            break;
          case 'S': case 'Q':
            coordCount = 4; // x1, y1, x, y
            break;
          case 'A':
            coordCount = 7; // rx, ry, rotation, large-arc, sweep, x, y
            break;
          case 'Z':
            coordCount = 0;
            break;
        }
        
        // Process coordinate pairs
        while (coordCount > 0 && i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          const isAbsolute = currentCommand === currentCommand.toUpperCase();
          
          if (currentCommand.toUpperCase() === 'H') {
            // Horizontal line - x only
            let x = parseFloat(tokens[i]);
            if (isAbsolute) {
              x = (x - offsetX) * scaleX;
            } else {
              x = x * scaleX;
            }
            result += ' ' + x.toFixed(2);
            i++;
            coordCount--;
          } else if (currentCommand.toUpperCase() === 'V') {
            // Vertical line - y only
            let y = parseFloat(tokens[i]);
            if (isAbsolute) {
              y = y * scaleY;
            } else {
              y = y * scaleY;
            }
            result += ' ' + y.toFixed(2);
            i++;
            coordCount--;
          } else if (currentCommand.toUpperCase() === 'A') {
            // Arc command: rx, ry, rotation, large-arc, sweep, x, y
            for (let j = 0; j < 7 && i < tokens.length; j++, i++) {
              let val = parseFloat(tokens[i]);
              if (j === 0) val = val * scaleX; // rx
              else if (j === 1) val = val * scaleY; // ry
              else if (j === 5) val = isAbsolute ? (val - offsetX) * scaleX : val * scaleX; // x
              else if (j === 6) val = isAbsolute ? val * scaleY : val * scaleY; // y
              result += ' ' + val.toFixed(2);
            }
            coordCount = 0;
          } else {
            // Regular coordinate pair (x, y)
            let x = parseFloat(tokens[i]);
            let y = parseFloat(tokens[i + 1]);
            
            if (isAbsolute) {
              x = (x - offsetX) * scaleX;
              y = y * scaleY;
            } else {
              x = x * scaleX;
              y = y * scaleY;
            }
            
            result += ' ' + x.toFixed(2) + ' ' + y.toFixed(2);
            i += 2;
            coordCount -= 2;
          }
        }
      } else {
        i++;
      }
    }
    
    return result;
  };

  // Calculate coverage of a region
  const calculateRegionCoverage = (drawings, regionPath) => {
    if (!drawings || drawings.length === 0) {
      return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
    }

    // Create canvas for the region
    const regionCanvas = document.createElement('canvas');
    regionCanvas.width = CANVAS_WIDTH;
    regionCanvas.height = CANVAS_HEIGHT;
    const regionCtx = regionCanvas.getContext('2d');
    
    // Fill the region
    regionCtx.fillStyle = 'white';
    regionCtx.fill(regionPath);
    
    // Count region pixels
    const regionImageData = regionCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const regionPixels = regionImageData.data;
    
    let totalRegionPixels = 0;
    for (let i = 0; i < regionPixels.length; i += 4) {
      if (regionPixels[i] > 200) {
        totalRegionPixels++;
      }
    }
    
    if (totalRegionPixels === 0) {
      return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
    }
    
    // Create canvas for drawings
    const drawingCanvas = document.createElement('canvas');
    drawingCanvas.width = CANVAS_WIDTH;
    drawingCanvas.height = CANVAS_HEIGHT;
    const drawingCtx = drawingCanvas.getContext('2d');
    
    // Replay drawings
    drawingCtx.strokeStyle = 'red';
    drawingCtx.lineWidth = 12;
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';
    
    let isDrawing = false;
    drawings.forEach(point => {
      if (point.type === 'start') {
        drawingCtx.beginPath();
        drawingCtx.moveTo(point.x, point.y);
        isDrawing = true;
      } else if (point.type === 'draw' && isDrawing) {
        drawingCtx.lineTo(point.x, point.y);
        drawingCtx.stroke();
      } else if (point.type === 'end') {
        isDrawing = false;
      }
    });
    
    // Count overlap
    const drawingImageData = drawingCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const drawingPixels = drawingImageData.data;
    
    let overlapPixels = 0;
    for (let i = 0; i < regionPixels.length; i += 4) {
      const isInRegion = regionPixels[i] > 200;
      const isDrawn = drawingPixels[i] > 50;
      
      if (isInRegion && isDrawn) {
        overlapPixels++;
      }
    }
    
    const coveragePercentage = totalRegionPixels > 0 
      ? (overlapPixels / totalRegionPixels) * 100 
      : 0;
    
    return {
      percentage: coveragePercentage,
      coveredPixels: overlapPixels,
      totalPixels: totalRegionPixels
    };
  };

  // Calculate CTS scores based on hand diagram data
  const calculateCTSScores = () => {
    const scores = {
      left: analyzeSingleHand('Left'),
      right: analyzeSingleHand('Right')
    };
    setCtsScores(scores);
    return scores;
  };

  const analyzeSingleHand = (hand) => {
    const symptoms = analyzeSymptomDistribution(hand);
    
    return {
      alternativeScore: calculateAlternativeScore(symptoms),
      detailedCoverage: symptoms.detailedCoverage
    };
  };

  const analyzeSymptomDistribution = (hand) => {
    const handKey = hand === 'Left' ? 'leftFront' : 'rightFront';
    const regions = svgRegions[handKey];
    
    if (!regions || Object.keys(regions).length === 0) {
      console.warn('No SVG regions loaded for', handKey);
      return {
        medianDigitsAffected: 0,
        detailedCoverage: {}
      };
    }

    // Track coverage for each region
    const coverage = {};
    
    // Only check tingling and numbness (not pain) for CTS assessment
    ['tingling', 'numbness'].forEach(symptomType => {
      const frontKey = `${symptomType}Front${hand}`;
      const frontData = handDiagramData[frontKey] || [];
      
      // Check both distal AND middle phalanges for scoring
      const requiredRegions = [
        'thumb_distal',    // Thumb: any coverage of distal
        'index_distal', 'index_middle',    // Index: distal and middle
        'middle_distal', 'middle_middle'   // Middle: distal and middle
      ];
      
      requiredRegions.forEach(regionName => {
        const regionData = regions[regionName];
        if (!regionData) {
          console.warn('Region not found:', regionName, 'in', handKey);
          return;
        }
        
        const regionCoverage = calculateRegionCoverage(frontData, regionData.path2D);
        
        // Initialize or update coverage
        if (!coverage[regionName]) {
          coverage[regionName] = regionCoverage.percentage;
        } else {
          // Take the maximum coverage from either symptom type
          coverage[regionName] = Math.max(coverage[regionName], regionCoverage.percentage);
        }
      });
    });

    // NEW SCORING LOGIC:
    // Thumb: Affected if >0% of distal (some involvement)
    // Index: Affected if (>50% of middle phalanx) OR (some distal involvement)
    // Middle: Affected if (>50% of middle phalanx) OR (some distal involvement)
    
    let affectedDigits = 0;
    
    // Thumb: "some of the distal phalanx"
    const thumbAffected = (coverage['thumb_distal'] || 0) > 10; // >10% threshold for "some"
    if (thumbAffected) affectedDigits++;
    
    // Index: ">50% of middle phalanx and/or some of distal"
    const indexMiddle50 = (coverage['index_middle'] || 0) > 50;
    const indexDistalSome = (coverage['index_distal'] || 0) > 10;
    const indexAffected = indexMiddle50 || indexDistalSome;
    if (indexAffected) affectedDigits++;
    
    // Middle: ">50% of middle phalanx and/or some of distal" (most important)
    const middleMiddle50 = (coverage['middle_middle'] || 0) > 50;
    const middleDistalSome = (coverage['middle_distal'] || 0) > 10;
    const middleAffected = middleMiddle50 || middleDistalSome;
    if (middleAffected) affectedDigits++;

    return {
      medianDigitsAffected: affectedDigits,
      detailedCoverage: coverage,
      // Add detail for display
      digitDetails: {
        thumb: { affected: thumbAffected, distal: coverage['thumb_distal'] || 0 },
        index: { affected: indexAffected, distal: coverage['index_distal'] || 0, middle: coverage['index_middle'] || 0 },
        middle: { affected: middleAffected, distal: coverage['middle_distal'] || 0, middle: coverage['middle_middle'] || 0 }
      }
    };
  };

  // Alternative CTS scoring method
  const calculateAlternativeScore = (symptoms) => {
    const affected = symptoms.medianDigitsAffected;
    
    if (affected === 0) {
      return {
        score: 0,
        level: 'No Involvement',
        description: 'No median nerve digits show significant symptoms (>50% coverage)',
        interpretation: 'CTS is unlikely based on hand diagram'
      };
    } else if (affected === 1) {
      return {
        score: 1,
        level: 'Minimal Involvement',
        description: 'Exactly 1 median nerve digit affected',
        interpretation: 'Low probability of CTS. Consider other diagnoses or early-stage CTS.'
      };
    } else {
      // affected >= 2
      return {
        score: 2,
        level: 'Significant Involvement',
        description: '2 or more median nerve digits affected',
        interpretation: 'Moderate to high probability of CTS. Clinical correlation and nerve conduction studies recommended.'
      };
    }
  };

  const drawHandOutline = (canvas, isLeft = false, isBack = false) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const imagePath = isBack ? '/hands/hands_back.png' : '/hands/hands_front.png';

    img.onload = () => {
      // Draw the appropriate hand from the image
      const sourceX = isLeft ? 0 : img.width / 2;
      ctx.drawImage(
        img,
        sourceX, 0, img.width / 2, img.height,
        0, 0, canvas.width, canvas.height
      );

      // Only draw SVG region highlights on front view
      if (!isBack && (Object.keys(svgRegions.leftFront).length > 0 || Object.keys(svgRegions.rightFront).length > 0)) {
        drawSVGRegionsOverlay(canvas, isLeft);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load hand image:', imagePath);
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(isBack ? 'Back View' : 'Palm View', canvas.width / 2, canvas.height / 2);
    };
    
    img.src = imagePath;
  };

  const drawSVGRegionsOverlay = (canvas, isLeft) => {
    const handKey = isLeft ? 'leftFront' : 'rightFront';
    const regions = svgRegions[handKey];
    
    if (!regions) return;

    const ctx = canvas.getContext('2d');
    
    // Highlight only median nerve digits (thumb, index, middle) distal regions
    const highlightRegions = ['thumb_distal', 'index_distal', 'middle_distal'];
    
    highlightRegions.forEach(regionName => {
      const regionData = regions[regionName];
      if (!regionData) return;
      
      // Color code: middle finger gets stronger highlight
      const fillStyle = regionName === 'middle_distal' 
        ? 'rgba(0, 0, 255, 0.15)'  // Stronger blue for middle
        : 'rgba(255, 255, 0, 0.1)'; // Yellow for thumb/index
      
      ctx.fillStyle = fillStyle;
      ctx.fill(regionData.path2D);
      
      // Optional: draw outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke(regionData.path2D);
    });
  };

  useEffect(() => {
    // Initialize all hand diagrams
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const isLeft = key.includes('Left');
        const isBack = key.includes('Back');
        drawHandOutline(ref.current, isLeft, isBack);
      }
    });
  }, [currentSection, svgRegions]);

  const handleCanvasMouseDown = (e, canvasKey) => {
    const canvas = e.target;
    canvas.isDrawing = true;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(122, 81, 245, 0.6)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
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
    
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'draw', x, y }]
    }));
  };

  const handleCanvasMouseUp = (e, canvasKey) => {
    const canvas = e.target;
    canvas.isDrawing = false;
    
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), { type: 'end' }]
    }));
  };

  const clearCanvas = (canvasKey) => {
    const canvas = canvasRefs[canvasKey].current;
    if (canvas) {
      const isLeft = canvasKey.includes('Left');
      const isBack = canvasKey.includes('Back');
      drawHandOutline(canvas, isLeft, isBack);
      
      setHandDiagramData(prev => ({
        ...prev,
        [canvasKey]: []
      }));
    }
  };

  const isCurrentSectionComplete = () => {
    switch (currentSection) {
      case 0:
        // Filter questions based on screening answer
        const questionsToValidate = diagnosticQuestions.filter(question => {
          if (!question.requiresNumbnessOrTingling) return true;
          return diagnosticAnswers[0] === 'Yes';
        });
        
        const allQuestionsAnswered = questionsToValidate.every(question => 
          diagnosticAnswers[question.id] !== undefined && diagnosticAnswers[question.id] !== ''
        );
        const easeAnswered = diagnosticEase !== '';
        return allQuestionsAnswered && easeAnswered;
      
      case 1:
        const diagramEaseAnswered = diagramEase !== '';
        return diagramEaseAnswered;
      
      default:
        return true;
    }
  };

  const handleNextSection = () => {
    if (!isCurrentSectionComplete()) {
      setHighlightIncomplete(true);
      setTimeout(() => setHighlightIncomplete(false), 3000);
      return;
    }

    // Calculate CTS scores when moving from hand diagrams to assessment
    if (currentSection === 1) {
      calculateCTSScores();
    }

    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setHighlightIncomplete(false);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setHighlightIncomplete(false);
      window.scrollTo(0, 0);
    }
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
      ctsScores
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CTS_Survey_${participantId}.json`;
    a.click();
  };

  const getQuestionIndicator = (isAnswered) => {
    if (isAnswered) {
      return <Check className="w-6 h-6 text-green-600 flex-shrink-0" />;
    }
    return <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />;
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-3">
                Diagnostic Questions
              </h2>
              <p className="text-green-700 text-lg">
                Please answer the following questions about your symptoms.
              </p>
            </div>

            <div className="space-y-4">
              {diagnosticQuestions.map((question) => {
                // Skip numbness/tingling questions if user answered "No" to screening question
                if (question.requiresNumbnessOrTingling && diagnosticAnswers[0] === 'No') {
                  return null;
                }
                
                return (
                  <div
                    key={question.id}
                    className={`bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${
                      highlightIncomplete && !diagnosticAnswers[question.id]
                        ? 'border-red-500 bg-red-50 animate-pulse'
                        : 'border-gray-200'
                    } ${question.isScreening ? 'border-blue-300 bg-blue-50' : ''}`}
                  >
                    <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                      {getQuestionIndicator(diagnosticAnswers[question.id] !== undefined && diagnosticAnswers[question.id] !== '')}
                      <span className="flex-1">
                        {question.text}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="Yes"
                          checked={diagnosticAnswers[question.id] === 'Yes'}
                          onChange={(e) => {
                            const newAnswers = { ...diagnosticAnswers, [question.id]: e.target.value };
                            if (question.isScreening) {
                              setHasNumbnessOrTingling(true);
                            }
                            setDiagnosticAnswers(newAnswers);
                          }}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="ml-3 font-medium">Yes</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="No"
                          checked={diagnosticAnswers[question.id] === 'No'}
                          onChange={(e) => {
                            const newAnswers = { ...diagnosticAnswers, [question.id]: e.target.value };
                            if (question.isScreening) {
                              setHasNumbnessOrTingling(false);
                            }
                            setDiagnosticAnswers(newAnswers);
                          }}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="ml-3 font-medium">No</span>
                      </label>
                      {question.hasNotRelevant && (
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="Not relevant"
                            checked={diagnosticAnswers[question.id] === 'Not relevant'}
                            onChange={(e) => setDiagnosticAnswers({ ...diagnosticAnswers, [question.id]: e.target.value })}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className="ml-3 font-medium">Not relevant</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
              <div className={`${highlightIncomplete && diagnosticEase === '' ? 'bg-red-50 border-red-500 border-2 rounded-lg p-4' : ''}`}>
                <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                  {getQuestionIndicator(diagnosticEase !== '')}
                  <span>How easy was it to answer these questions?</span>
                </p>
                <div className="flex flex-wrap gap-6">
                  {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="diagnostic-ease"
                        value={option}
                        checked={diagnosticEase === option}
                        onChange={(e) => setDiagnosticEase(e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-3 font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 1:
        // Filter symptoms based on screening question answer
        const allSymptoms = [
          { type: 'tingling', label: 'Tingling', instruction: 'Mark areas where you feel pins and needles or tingling sensations' },
          { type: 'numbness', label: 'Numbness', instruction: 'Mark areas where you have reduced or no sensation' },
          { type: 'pain', label: 'Pain', instruction: 'Mark areas where you experience pain or discomfort' }
        ];
        
        const symptoms = diagnosticAnswers[0] === 'No' 
          ? allSymptoms.filter(s => s.type === 'pain')
          : allSymptoms;

        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
              <h2 className="text-2xl font-bold text-purple-800 mb-4">Hand Diagrams</h2>
              <p className="text-purple-700 text-lg mb-2">
                Please mark the areas where you experience symptoms on the hand diagrams below.
              </p>
            </div>

            {symptoms.map((symptom) => (
              <div key={symptom.type} className="space-y-6">
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 rounded-lg">
                  <h3 className="text-2xl font-bold text-gray-800">
                    {symptom.label}
                  </h3>
                  <p className="text-gray-600 mt-2">{symptom.instruction}</p>
                </div>

                {/* Front view */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-xl font-semibold mb-6 text-center">Palm side (Volar view):</h4>
                  <div className="flex gap-12 justify-center">
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg">Left Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}FrontLeft`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontLeft`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontLeft`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                      />
                      <button
                        onClick={() => clearCanvas(`${symptom.type}FrontLeft`)}
                        className="mt-4 px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg">Right Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}FrontRight`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontRight`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontRight`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                      />
                      <button
                        onClick={() => clearCanvas(`${symptom.type}FrontRight`)}
                        className="mt-4 px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back view */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-xl font-semibold mb-6 text-center">Back of hands (Dorsal view):</h4>
                  <div className="flex gap-12 justify-center">
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg">Left Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}BackLeft`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackLeft`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackLeft`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                      />
                      <button
                        onClick={() => clearCanvas(`${symptom.type}BackLeft`)}
                        className="mt-4 px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-4 font-bold text-lg">Right Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}BackRight`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackRight`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackRight`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                      />
                      <button
                        onClick={() => clearCanvas(`${symptom.type}BackRight`)}
                        className="mt-4 px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                {getQuestionIndicator(diagramEase !== '')}
                <span>How easy was it to mark the diagrams?</span>
              </p>
              <div className="flex flex-wrap gap-6">
                {['Very easy', 'Somewhat easy', 'Somewhat difficult', 'Very difficult'].map((option) => (
                  <label key={option} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="diagram-ease"
                      value={option}
                      checked={diagramEase === option}
                      onChange={(e) => setDiagramEase(e.target.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="ml-3 font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-3">
                Assessment Result
              </h2>
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Important Note
              </h4>
              <p className="text-sm">
                This assessment tool is for screening purposes only and should not replace professional medical diagnosis.
                This scoring method counts how many median nerve digits (thumb, index, middle) show significant 
                symptoms (&gt;50% coverage). If you have concerns about your symptoms, please consult with a healthcare 
                provider for proper evaluation including nerve conduction studies if indicated.
              </p>
            </div>

            {ctsScores && (
              <div className="space-y-6">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                    <h3 className="text-2xl font-bold mb-6 capitalize">{hand} Hand Assessment</h3>
                    
                    {/* Score Display */}
                    <div className={`p-6 rounded-lg mb-6 ${
                      ctsScores[hand].alternativeScore.score === 2 ? 'bg-red-50 border-2 border-red-300' :
                      ctsScores[hand].alternativeScore.score === 1 ? 'bg-yellow-50 border-2 border-yellow-300' :
                      'bg-green-50 border-2 border-green-300'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-xl">Score:</h4>
                        <div className={`text-4xl font-bold ${
                          ctsScores[hand].alternativeScore.score === 2 ? 'text-red-700' :
                          ctsScores[hand].alternativeScore.score === 1 ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          {ctsScores[hand].alternativeScore.score}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">{ctsScores[hand].alternativeScore.level}</p>
                        <p className="text-sm">{ctsScores[hand].alternativeScore.description}</p>
                        <p className="text-sm mt-3 italic">{ctsScores[hand].alternativeScore.interpretation}</p>
                      </div>
                    </div>

                    {/* Coverage Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Median Nerve Digit Coverage:</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        * Thumb: affected if &gt;10% distal coverage<br/>
                        * Index/Middle: affected if &gt;50% middle phalanx OR &gt;10% distal
                      </p>
                      <div className="space-y-4">
                        {/* Thumb */}
                        <div className="border-l-4 border-red-300 pl-3">
                          <div className="font-medium text-sm mb-2">Thumb:</div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Distal (tip):</span>
                              <span className={(ctsScores[hand].detailedCoverage['thumb_distal'] || 0) > 10 ? 'font-bold text-red-600' : 'text-gray-600'}>
                                {(ctsScores[hand].detailedCoverage['thumb_distal'] || 0).toFixed(1)}%
                                {(ctsScores[hand].detailedCoverage['thumb_distal'] || 0) > 10 && ' ✓'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded h-2">
                              <div 
                                className={`h-2 rounded ${(ctsScores[hand].detailedCoverage['thumb_distal'] || 0) > 10 ? 'bg-red-500' : 'bg-blue-400'}`}
                                style={{ width: `${Math.min(ctsScores[hand].detailedCoverage['thumb_distal'] || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Index */}
                        <div className="border-l-4 border-green-300 pl-3">
                          <div className="font-medium text-sm mb-2">Index:</div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Distal (tip):</span>
                                <span className={(ctsScores[hand].detailedCoverage['index_distal'] || 0) > 10 ? 'font-bold text-red-600' : 'text-gray-600'}>
                                  {(ctsScores[hand].detailedCoverage['index_distal'] || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded h-2">
                                <div 
                                  className={`h-2 rounded ${(ctsScores[hand].detailedCoverage['index_distal'] || 0) > 10 ? 'bg-red-500' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(ctsScores[hand].detailedCoverage['index_distal'] || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Middle phalanx:</span>
                                <span className={(ctsScores[hand].detailedCoverage['index_middle'] || 0) > 50 ? 'font-bold text-red-600' : 'text-gray-600'}>
                                  {(ctsScores[hand].detailedCoverage['index_middle'] || 0).toFixed(1)}%
                                  {(ctsScores[hand].detailedCoverage['index_middle'] || 0) > 50 && ' ✓'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded h-2">
                                <div 
                                  className={`h-2 rounded ${(ctsScores[hand].detailedCoverage['index_middle'] || 0) > 50 ? 'bg-red-500' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(ctsScores[hand].detailedCoverage['index_middle'] || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Middle (Most Important) */}
                        <div className="border-l-4 border-blue-500 pl-3 bg-blue-50 -ml-4 pl-4 py-2">
                          <div className="font-medium text-sm mb-2 flex items-center gap-2">
                            Middle (Most Important):
                            <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">Key Indicator</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Distal (tip):</span>
                                <span className={(ctsScores[hand].detailedCoverage['middle_distal'] || 0) > 10 ? 'font-bold text-red-600' : 'text-gray-600'}>
                                  {(ctsScores[hand].detailedCoverage['middle_distal'] || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded h-2">
                                <div 
                                  className={`h-2 rounded ${(ctsScores[hand].detailedCoverage['middle_distal'] || 0) > 10 ? 'bg-red-500' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(ctsScores[hand].detailedCoverage['middle_distal'] || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Middle phalanx:</span>
                                <span className={(ctsScores[hand].detailedCoverage['middle_middle'] || 0) > 50 ? 'font-bold text-red-600' : 'text-gray-600'}>
                                  {(ctsScores[hand].detailedCoverage['middle_middle'] || 0).toFixed(1)}%
                                  {(ctsScores[hand].detailedCoverage['middle_middle'] || 0) > 50 && ' ✓'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded h-2">
                                <div 
                                  className={`h-2 rounded ${(ctsScores[hand].detailedCoverage['middle_middle'] || 0) > 50 ? 'bg-red-500' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(ctsScores[hand].detailedCoverage['middle_middle'] || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-4">
            <Hand className="w-10 h-10 text-blue-600" />
            Carpal Tunnel Syndrome Diagnostic Tool
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
              {currentSection > 0 && (
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
                    currentSection === 2
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {currentSection === 1 ? 'Calculate CTS Scores' : currentSection === 2 ? 'Complete' : 'Next'}
                  <ChevronRight className="w-5 h-5" />
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