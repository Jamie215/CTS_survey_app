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
  const [ctsScores, setCtsScores] = useState(null);
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
    { id: 1, text: "Do you wake up because of tingling or numbness in your fingers?", requiresNumbnessOrTingling: true },
    { id: 2, text: "Do you have tingling or numbness in your fingers when you first wake up?", requiresNumbnessOrTingling: true },
    { id: 3, text: "Is your numbness or tingling mainly in your thumb, index, and/or middle finger?", requiresNumbnessOrTingling: true },
    { id: 4, text: "Do you have any quick movements or positions that relieve your tingling or numbness?", requiresNumbnessOrTingling: true },
    { id: 5, text: "Do you have numbness or tingling in your little (small/pinky) finger?", requiresNumbnessOrTingling: true },
    { id: 6, text: "Do certain activities (for example, holding objects or repetitive finger movement) increase the numbness or tingling in your fingers?", requiresNumbnessOrTingling: true },
    { id: 7, text: "Did you have numbness or tingling in your fingers when you were pregnant? (If relevant)", hasNotRelevant: true, requiresNumbnessOrTingling: true },
    { id: 8, text: "Do you wake up because of pain in your wrist?" },
    { id: 9, text: "Do you drop small objects like coins or a cup?" },
    { id: 10, text: "Do you often have neck pain?" },
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

      // Load SVGs
      console.log('Load SVG regions for hand diagrams...');
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
        console.log(`Paths found in ${name}:`, paths.length);

        paths.forEach(path => {
          const label = path.getAttribute('inkscape:label') ||
                        path.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                        path.getAttribute('id');
          const d = path.getAttribute('d'); 
          if (label && d) {
            const path2D = new Path2D(d);
            regions[label] = { path2D, pathString: d, label };
          }
        });
      }

      // FIXED: Set state AFTER all files are loaded
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

  // Calculate combined coverage of a region
  const calculateCombinedRegionCoverage = (allDrawings, regionPath) => {
    const flattenedDrawings = allDrawings.flat().filter(d => d);
    if (flattenedDrawings.length === 0) {
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
    
    // Create combined canvas for all drawings
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = CANVAS_WIDTH;
    combinedCanvas.height = CANVAS_HEIGHT;
    const combinedCtx = combinedCanvas.getContext('2d');
    
    // Combine all drawings into one
    allDrawings.forEach(drawings => {
      if (!drawings || drawings.length === 0) return;
      
      combinedCtx.strokeStyle = 'red';
      combinedCtx.lineWidth = 12;
      combinedCtx.lineCap = 'round';
      combinedCtx.lineJoin = 'round';
      
      let isDrawing = false;
      drawings.forEach(point => {
        if (point.type === 'start') {
          combinedCtx.beginPath();
          combinedCtx.moveTo(point.x, point.y);
          isDrawing = true;
        } else if (point.type === 'draw' && isDrawing) {
          combinedCtx.lineTo(point.x, point.y);
          combinedCtx.stroke();
        } else if (point.type === 'end') {
          isDrawing = false;
        }
      });
    });
    
    // Count overlap between combined drawings and region
    const combinedImageData = combinedCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const combinedPixels = combinedImageData.data;
    
    let overlapPixels = 0;
    for (let i = 0; i < regionPixels.length; i += 4) {
      const isInRegion = regionPixels[i] > 200;
      const isDrawn = combinedPixels[i] > 50;
      
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

  // Calculate region coverage for individual symptom
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
      KatzScore: {
        ...calculateKatzScore(symptoms),
        coverageBySymptom: symptoms.coverageBySymptom
      },
      detailedCoverage: symptoms.detailedCoverage
    };
  };

  const analyzeSymptomDistribution = (hand) => {
    const regionsFront = svgRegions[hand === 'Left' ? 'leftFront' : 'rightFront'];
    const regionsBack = svgRegions[hand === 'Left' ? 'leftBack' : 'rightBack'];
    
    if (!regionsFront || !regionsBack || Object.keys(regionsFront).length === 0 || Object.keys(regionsBack).length === 0) {
      console.warn('No SVG regions loaded for', hand);
      return {
        medianDigitsAffected: 0,
        detailedCoverage: {},
        coverageBySymptom: {}
      };
    }

    // Track combined coverage for each region (using all three symptom types)
    const coverage = {};
    
    // Track coverage by symptom type for detailed display
    const coverageBySymptom = {
      tingling: {},
      numbness: {},
      pain: {}
    };
    
    // FIXED: Added const declarations
    const requiredFrontRegions = Object.keys(regionsFront);
    const requiredBackRegions = Object.keys(regionsBack);
    
    // Calculate individual symptom coverage for display
    ['tingling', 'numbness', 'pain'].forEach(symptomType => {
      const frontKey = `${symptomType}Front${hand}`;
      const frontData = handDiagramData[frontKey] || [];
      const backKey = `${symptomType}Back${hand}`;
      const backData = handDiagramData[backKey] || [];
      
      requiredFrontRegions.forEach(regionName => {
        const regionData = regionsFront[regionName]; // FIXED: was 'regions'
        if (!regionData) return;
        
        // Calculate individual symptom coverage
        const regionCoverage = calculateRegionCoverage(frontData, regionData.path2D);
        
        // Store coverage by symptom type (for display)
        coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
      });

      requiredBackRegions.forEach(regionName => {
        const regionData = regionsBack[regionName]; // FIXED: was 'regions'
        if (!regionData) return;

        // Calculate individual symptom coverage
        const regionCoverage = calculateRegionCoverage(backData, regionData.path2D);

        // Store coverage by symptom type (for display)
        coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
      });
    });

    // Calculate combined coverage for front regions
    requiredFrontRegions.forEach(regionName => {
      const regionData = regionsFront[regionName]; // FIXED: was 'regions'
      if (!regionData) return;
      
      // Get drawings from ALL three symptom types
      const tinglingData = handDiagramData[`tinglingFront${hand}`] || [];
      const numbnessData = handDiagramData[`numbnessFront${hand}`] || [];
      const painData = handDiagramData[`painFront${hand}`] || [];
      
      const combinedCoverage = calculateCombinedRegionCoverage(
        [tinglingData, numbnessData, painData],
        regionData.path2D
      );
      
      // Store combined coverage
      coverage[regionName] = combinedCoverage.percentage;
    });

    // Calculate combined coverage for back regions
    requiredBackRegions.forEach(regionName => {
      const regionData = regionsBack[regionName]; // FIXED: was 'regions'
      if (!regionData) return;
      
      // Get drawings from ALL three symptom types
      const tinglingData = handDiagramData[`tinglingBack${hand}`] || [];
      const numbnessData = handDiagramData[`numbnessBack${hand}`] || [];
      const painData = handDiagramData[`painBack${hand}`] || [];
      
      const combinedCoverage = calculateCombinedRegionCoverage(
        [tinglingData, numbnessData, painData],
        regionData.path2D
      );
      
      // Store combined coverage
      coverage[regionName] = combinedCoverage.percentage;
    });

    // FIXED Katz scoring logic:
    let affectedDigits = 0;
    let someThreshold = 5;
    
    // Check volar (front) regions only for thumb, index, middle
    const thumbVolar = (coverage['thumb_distal'] || 0) > someThreshold || 
                      (coverage['thumb_middle'] || 0) > someThreshold;
    const indexVolar = (coverage['index_distal'] || 0) > someThreshold || 
                      (coverage['index_middle'] || 0) > someThreshold;
    const middleVolar = (coverage['middle_distal'] || 0) > someThreshold || 
                       (coverage['middle_middle'] || 0) > someThreshold;
    
    if (thumbVolar) affectedDigits++;
    if (indexVolar) affectedDigits++;
    if (middleVolar) affectedDigits++;
    
    // Check other regions  
    const palmRadialAffected = (coverage['palm_radial'] || 0) > someThreshold;
    const palmUlnarAffected = (coverage['palm_ulnar'] || 0) > someThreshold;
    const palmAffected = palmRadialAffected || palmUlnarAffected;
    const wristAffected = (coverage['wrist'] || 0) > someThreshold;
    
    // Check if ANY back regions are affected (dorsum)
    const dorsumAffected = requiredBackRegions.some(regionName => 
      (coverage[regionName] || 0) > someThreshold
    );

    return {
      medianDigitsAffected: affectedDigits,
      medianProximalAffected: false, // Not used in Katz
      palmAffected: { radial: palmRadialAffected, ulnar: palmUlnarAffected },
      wristAffected: wristAffected,
      dorsumAffected: dorsumAffected,
      details: {
        thumb: { affected: thumbVolar, distal: coverage['thumb_distal'] || 0, proximal: coverage['thumb_proximal'] || 0 },
        index: { affected: indexVolar, distal: coverage['index_distal'] || 0, middle: coverage['index_middle'] || 0, proximal: coverage['index_proximal'] || 0 },
        middle: { affected: middleVolar, distal: coverage['middle_distal'] || 0, middle: coverage['middle_middle'] || 0, proximal: coverage['middle_proximal'] || 0 },
        palm: { affected: palmAffected, radial: coverage['palm_radial'] || 0, ulnar: coverage['palm_ulnar'] || 0},
        wrist: { affected: wristAffected, coverage: coverage['wrist'] || 0 },
        dorsum: { affected: dorsumAffected, coverage: coverage['dorsum'] || 0 }
      },
      detailedCoverage: coverage,  // Combined coverage
      coverageBySymptom: coverageBySymptom,  // Individual breakdown
    };
  };

  // FIXED: Katz scoring method with corrected logic
  const calculateKatzScore = (symptoms) => {
    const medianDigitsAffected = symptoms.medianDigitsAffected;
    const palmAffected = symptoms.palmAffected;
    const dorsumAffected = symptoms.dorsumAffected;
    
    if (medianDigitsAffected === 0) {
      return {
        score: 0,
        description: 'CTS is unlikely based on hand diagram'
      };
    } else if (medianDigitsAffected >= 2 && !palmAffected.radial && !palmAffected.ulnar && !dorsumAffected) {
      // Classic: ≥2 volar digits, no palm, no dorsum
      return {
        score: 3,
        description: 'Classic CTS presentation. Further evaluation strongly recommended.'
      };
    } else if (medianDigitsAffected >= 2 && (palmAffected.radial || palmAffected.ulnar) && !(palmAffected.ulnar && !palmAffected.radial)) {
      // Probable: ≥2 volar digits, palm allowed (except ulnar only)
      return {
        score: 2,
        description: 'Probable CTS. Further evaluation strongly recommended.'
      };
    } else if (medianDigitsAffected >= 1) {
      // Possible: ≥1 volar digit
      return {
        score: 1,
        description: 'Possibility of CTS. Consider other diagnoses or early-stage CTS.'
      };
    } else {
      return {
        score: 0,
        description: 'CTS is unlikely based on hand diagram'
      };
    }
  };

  const drawHandOutline = (canvas, isLeft = false, isBack = false) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    // Use pre-split images that exactly match canvas dimensions
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
    };
    
    img.src = imagePath;
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
  }, [isClient]);

  const clearCanvas = (canvasRef, symptomType, side, hand) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const isLeft = hand === 'Left';
      const isBack = side === 'Back';
      drawHandOutline(canvas, isLeft, isBack);
      
      // Clear drawing data
      const dataKey = `${symptomType}${side}${hand}`;
      setHandDiagramData(prev => ({ ...prev, [dataKey]: [] }));
    }
  };

  const startDrawing = (canvasRef, e, symptomType, side, hand) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    
    const dataKey = `${symptomType}${side}${hand}`;
    const currentData = handDiagramData[dataKey] || [];
    
    setHandDiagramData(prev => ({
      ...prev,
      [dataKey]: [...currentData, { type: 'start', x, y }]
    }));
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
      
      setHandDiagramData(prev => {
        const data = prev[dataKey] || [];
        return {
          ...prev,
          [dataKey]: [...data, { type: 'draw', x, y }]
        };
      });
      
      // Draw on canvas
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = symptomType === 'tingling' ? '#9333ea' :
                       symptomType === 'numbness' ? '#3b82f6' : '#f97316';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const prevData = handDiagramData[dataKey] || [];
      if (prevData.length > 0) {
        const lastPoint = prevData[prevData.length - 1];
        if (lastPoint.type === 'start' || lastPoint.type === 'draw') {
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    };
    
    const handleMouseUp = () => {
      setHandDiagramData(prev => {
        const data = prev[dataKey] || [];
        return {
          ...prev,
          [dataKey]: [...data, { type: 'end' }]
        };
      });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Draw initial point
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = symptomType === 'tingling' ? '#9333ea' :
                   symptomType === 'numbness' ? '#3b82f6' : '#f97316';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleDiagnosticAnswer = (questionId, answer) => {
    const newAnswers = { ...diagnosticAnswers, [questionId]: answer };
    setDiagnosticAnswers(newAnswers);
    
    if (questionId === 0) {
      setHasNumbnessOrTingling(answer === 'yes');
    }
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
      
      // Calculate CTS scores
      calculateCTSScores();
      
      // Draw combined canvases for results
      drawCombinedSymptoms();
    }
    
    setCurrentSection(currentSection + 1);
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
  };

  const drawCombinedSymptoms = () => {
    ['Left', 'Right'].forEach(hand => {
      const canvasRef = hand === 'Left' ? resultsCanvasRefs.combinedLeft : resultsCanvasRefs.combinedRight;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      // Draw hand outline
      drawHandOutline(canvas, hand === 'Left', false);
      
      // Overlay all symptoms with transparency
      setTimeout(() => {
        ['tingling', 'numbness', 'pain'].forEach((symptom, idx) => {
          const data = handDiagramData[`${symptom}Front${hand}`] || [];
          
          ctx.strokeStyle = symptom === 'tingling' ? 'rgba(147, 51, 234, 0.4)' :
                           symptom === 'numbness' ? 'rgba(59, 130, 246, 0.4)' : 
                           'rgba(249, 115, 22, 0.4)';
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
      }, 100);
    });
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
                            onMouseDown={(e) => startDrawing(
                              canvasRefs[`${symptom}FrontLeft`],
                              e,
                              symptom,
                              'Front',
                              'Left'
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}FrontLeft`], symptom, 'Front', 'Left')}
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
                            onMouseDown={(e) => startDrawing(
                              canvasRefs[`${symptom}BackLeft`],
                              e,
                              symptom,
                              'Back',
                              'Left'
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}BackLeft`], symptom, 'Back', 'Left')}
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
                            onMouseDown={(e) => startDrawing(
                              canvasRefs[`${symptom}FrontRight`],
                              e,
                              symptom,
                              'Front',
                              'Right'
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}FrontRight`], symptom, 'Front', 'Right')}
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
                            onMouseDown={(e) => startDrawing(
                              canvasRefs[`${symptom}BackRight`],
                              e,
                              symptom,
                              'Back',
                              'Right'
                            )}
                          />
                          <button
                            onClick={() => clearCanvas(canvasRefs[`${symptom}BackRight`], symptom, 'Back', 'Right')}
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
            <h2 className="text-3xl font-bold mb-8">CTS Assessment Results</h2>
            
            {ctsScores && (
              <div className="space-y-8">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-gray-50 rounded-xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold capitalize">
                        {hand} Hand
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className={`px-6 py-3 rounded-lg text-white font-bold text-lg ${
                          ctsScores[hand].KatzScore.score === 3 ? 'bg-red-600' :
                          ctsScores[hand].KatzScore.score === 2 ? 'bg-orange-500' :
                          ctsScores[hand].KatzScore.score === 1 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}>
                          Katz Score: {ctsScores[hand].KatzScore.score}/3
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-lg mb-6">{ctsScores[hand].KatzScore.description}</p>
                    
                    {/* Visual hand representation */}
                    <div className="mb-6 flex justify-center">
                      <canvas
                        ref={hand === 'left' ? resultsCanvasRefs.combinedLeft : resultsCanvasRefs.combinedRight}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border-2 border-gray-300 rounded-lg"
                        style={{ width: '225px', height: '300px' }}
                      />
                    </div>
                    
                    {/* Coverage Details for Key Regions */}
                    <div className="bg-white rounded-lg p-6">
                      <h4 className="font-bold text-lg mb-4">Region Coverage Analysis</h4>
                      
                      <div className="grid grid-cols-3 gap-6">
                        {/* Thumb */}
                        <div className="border-l-4 border-green-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Thumb:</h5>
                          {/* Thumb Distal */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['thumb_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                      <div 
                                        className={`h-2 rounded ${
                                          symptom === 'tingling' ? 'bg-purple-500' :
                                          symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(coverage, 100)}%`, opacity: isSignificant ? 1 : 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Index Finger */}
                        <div className="border-l-4 border-yellow-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Index Finger:</h5>
                          {/* Index Distal */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                      <div 
                                        className={`h-2 rounded ${
                                          symptom === 'tingling' ? 'bg-purple-500' :
                                          symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(coverage, 100)}%`, opacity: isSignificant ? 1 : 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Index Middle */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Middle phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_middle'] || 0;
                                const isSignificant = coverage > 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                      <div 
                                        className={`h-2 rounded ${
                                          symptom === 'tingling' ? 'bg-purple-500' :
                                          symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(coverage, 100)}%`, opacity: isSignificant ? 1 : 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Middle Finger */}
                        <div className="border-l-4 border-blue-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Middle Finger:</h5>
                          
                          {/* Middle Distal */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                      <div 
                                        className={`h-2 rounded ${
                                          symptom === 'tingling' ? 'bg-purple-500' :
                                          symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(coverage, 100)}%`, opacity: isSignificant ? 1 : 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Middle Middle */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Middle phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_middle'] || 0;
                                const isSignificant = coverage > 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded h-2">
                                      <div 
                                        className={`h-2 rounded ${
                                          symptom === 'tingling' ? 'bg-purple-500' :
                                          symptom === 'numbness' ? 'bg-blue-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${Math.min(coverage, 100)}%`, opacity: isSignificant ? 1 : 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
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
                  {currentSection === 1 ? 'Calculate CTS Scores' : 'Next'}
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