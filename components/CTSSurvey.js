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
  
  // Track drawing state with a ref to avoid stale closures
  const isDrawingRef = useRef(false);
  const currentCanvasKeyRef = useRef(null);
  
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
    { id: 0, text: "Do you ever have numbness and tingling in your fingers?", hasNumbnessOrTingling: true },
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

  // Calculate combined coverage of a region
  const calculateCombinedRegionCoverage = (allDrawings, regionPath) => {
    const flattenedDrawings = allDrawings.flat().filter(d => d);
    if (flattenedDrawings.length === 0) {
      return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
    }

    const regionCanvas = document.createElement('canvas');
    regionCanvas.width = CANVAS_WIDTH;
    regionCanvas.height = CANVAS_HEIGHT;
    const regionCtx = regionCanvas.getContext('2d');
    
    regionCtx.fillStyle = 'white';
    regionCtx.fill(regionPath);
    
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
    
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = CANVAS_WIDTH;
    combinedCanvas.height = CANVAS_HEIGHT;
    const combinedCtx = combinedCanvas.getContext('2d');
    
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

  // Calculate coverage of a region for individual symptom
  const calculateRegionCoverage = (drawings, regionPath) => {
    if (!drawings || drawings.length === 0) {
      return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
    }

    const regionCanvas = document.createElement('canvas');
    regionCanvas.width = CANVAS_WIDTH;
    regionCanvas.height = CANVAS_HEIGHT;
    const regionCtx = regionCanvas.getContext('2d');
    
    regionCtx.fillStyle = 'white';
    regionCtx.fill(regionPath);
    
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
    
    const drawingCanvas = document.createElement('canvas');
    drawingCanvas.width = CANVAS_WIDTH;
    drawingCanvas.height = CANVAS_HEIGHT;
    const drawingCtx = drawingCanvas.getContext('2d');
    
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
        palmAffected: { radial: false, ulnar: false, any: false, confinedToUlnar: false },
        wristAffected: false,
        dorsumAffected: false,
        thumbAffected: false,
        indexAffected: false,
        middleAffected: false,
        details: {},
        detailedCoverage: {},
        coverageBySymptom: {},
      };
    }

    const coverage = {};
    const coverageBySymptom = {
      tingling: {},
      numbness: {},
      pain: {}
    };

    const requiredFrontRegions = Object.keys(regionsFront);
    const requiredBackRegions = Object.keys(regionsBack);
    
    ['tingling', 'numbness', 'pain'].forEach(symptomType => {
      const frontKey = `${symptomType}Front${hand}`;
      const frontData = handDiagramData[frontKey] || [];
      const backKey = `${symptomType}Back${hand}`;
      const backData = handDiagramData[backKey] || [];
      
      requiredFrontRegions.forEach(regionName => {
        const regionData = regionsFront[regionName];
        if (!regionData) return;
        
        const regionCoverage = calculateRegionCoverage(frontData, regionData.path2D);
        coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
      });

      requiredBackRegions.forEach(regionName => {
        const regionData = regionsBack[regionName];
        if (!regionData) return;

        const regionCoverage = calculateRegionCoverage(backData, regionData.path2D);
        coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
      });
    });

    requiredFrontRegions.forEach(regionName => {
      const regionData = regionsFront[regionName];
      if (!regionData) return;
      
      const tinglingData = handDiagramData[`tinglingFront${hand}`] || [];
      const numbnessData = handDiagramData[`numbnessFront${hand}`] || [];
      const painData = handDiagramData[`painFront${hand}`] || [];
      
      const combinedCoverage = calculateCombinedRegionCoverage(
        [tinglingData, numbnessData, painData],
        regionData.path2D
      );
      
      coverage[regionName] = combinedCoverage.percentage;
    });

    requiredBackRegions.forEach(regionName => {
      const regionData = regionsBack[regionName];
      if (!regionData) return;
      
      const tinglingData = handDiagramData[`tinglingBack${hand}`] || [];
      const numbnessData = handDiagramData[`numbnessBack${hand}`] || [];
      const painData = handDiagramData[`painBack${hand}`] || [];
      
      const combinedCoverage = calculateCombinedRegionCoverage(
        [tinglingData, numbnessData, painData],
        regionData.path2D
      );
      
      coverage[regionName] = combinedCoverage.percentage;
    });

    // Katz scoring thresholds
    const SOME_THRESHOLD = 5;
    const HALF_THRESHOLD = 50;

    // THUMB: Must have volar shading over distal phalanx
    const thumbDistalCoverage = coverage['thumb_distal'] || 0;
    const thumbAffected = thumbDistalCoverage > SOME_THRESHOLD;

    // INDEX: At least half of middle phalanx OR some of distal phalanx
    const indexDistalCoverage = coverage['index_distal'] || 0;
    const indexMiddleCoverage = coverage['index_middle'] || 0;
    const indexAffected = (indexMiddleCoverage >= HALF_THRESHOLD) || (indexDistalCoverage > SOME_THRESHOLD);

    // MIDDLE (Long): At least half of middle phalanx OR some of distal phalanx
    const middleDistalCoverage = coverage['middle_distal'] || 0;
    const middleMiddleCoverage = coverage['middle_middle'] || 0;
    const middleAffected = (middleMiddleCoverage >= HALF_THRESHOLD) || (middleDistalCoverage > SOME_THRESHOLD);

    let affectedDigits = 0;
    if (thumbAffected) affectedDigits++;
    if (indexAffected) affectedDigits++;
    if (middleAffected) affectedDigits++;

    // Palm regions
    const palmRadialCoverage = coverage['palm_radial'] || 0;
    const palmUlnarCoverage = coverage['palm_ulnar'] || 0;
    const palmRadialAffected = palmRadialCoverage > SOME_THRESHOLD;
    const palmUlnarAffected = palmUlnarCoverage > SOME_THRESHOLD;
    const palmAffected = palmRadialAffected || palmUlnarAffected;
    const palmConfinedToUlnar = palmUlnarAffected && !palmRadialAffected;

    // Dorsum
    const dorsumCoverage = coverage['dorsum'] || 0;
    const dorsumAffected = dorsumCoverage > SOME_THRESHOLD;

    // Wrist
    const wristCoverage = coverage['wrist'] || 0;
    const wristAffected = wristCoverage > SOME_THRESHOLD;

    return {
      medianDigitsAffected: affectedDigits,
      thumbAffected,
      indexAffected,
      middleAffected,
      palmAffected: { 
        radial: palmRadialAffected, 
        ulnar: palmUlnarAffected, 
        any: palmAffected,
        confinedToUlnar: palmConfinedToUlnar
      },
      wristAffected,
      dorsumAffected,
      details: {
        thumb: { affected: thumbAffected, distal: thumbDistalCoverage, proximal: coverage['thumb_proximal'] || 0 },
        index: { affected: indexAffected, distal: indexDistalCoverage, middle: indexMiddleCoverage, proximal: coverage['index_proximal'] || 0 },
        middle: { affected: middleAffected, distal: middleDistalCoverage, middle: middleMiddleCoverage, proximal: coverage['middle_proximal'] || 0 },
        palm: { affected: palmAffected, radial: palmRadialCoverage, ulnar: palmUlnarCoverage, confinedToUlnar: palmConfinedToUlnar },
        wrist: { affected: wristAffected, coverage: wristCoverage },
        dorsum: { affected: dorsumAffected, coverage: dorsumCoverage }
      },
      detailedCoverage: coverage,
      coverageBySymptom: coverageBySymptom,
    };
  };

  // Katz Score Calculation
  // 3 (Classic): ≥2 digits, NO palm, NO dorsum
  // 2 (Probable): ≥2 digits, palm allowed unless confined to ulnar only, NO dorsum
  // 1 (Possible): ≥1 digit, may include dorsum
  // 0 (Unlikely): No volar shading in thumb, index, or middle
  const calculateKatzScore = (symptoms) => {
    const { medianDigitsAffected, palmAffected, dorsumAffected } = symptoms;
    
    if (medianDigitsAffected === 0) {
      return {
        score: 0,
        classification: 'Unlikely',
        description: 'No volar shading in thumb, index, or middle fingers'
      };
    }
    
    // Classic: 2+ digits, NO palm, NO dorsum
    if (medianDigitsAffected >= 2 && !palmAffected.any && !dorsumAffected) {
      return {
        score: 3,
        classification: 'Classic',
        description: 'Symptoms in 2+ median nerve digits (thumb, index, middle) with no palm or dorsum involvement'
      };
    }
    
    // Probable: 2+ digits, palm allowed unless confined to ulnar only, NO dorsum
    if (medianDigitsAffected >= 2 && !dorsumAffected) {
      if (palmAffected.any && !palmAffected.confinedToUlnar) {
        return {
          score: 2,
          classification: 'Probable',
          description: 'Symptoms in 2+ median nerve digits with palm involvement (not confined to ulnar side)'
        };
      }
    }
    
    // Possible: At least 1 digit, may include dorsum
    if (medianDigitsAffected >= 1) {
      let reason = '';
      if (dorsumAffected) {
        reason = ' (includes dorsum involvement)';
      } else if (palmAffected.confinedToUlnar) {
        reason = ' (palm symptoms confined to ulnar side)';
      } else if (medianDigitsAffected === 1) {
        reason = ' (only 1 median nerve digit affected)';
      }
      
      return {
        score: 1,
        classification: 'Possible',
        description: `Symptoms in at least 1 median nerve digit${reason}`
      };
    }
    
    return {
      score: 0,
      classification: 'Unlikely',
      description: 'Insufficient median nerve distribution pattern'
    };
  };

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

  useEffect(() => {
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const isLeft = key.includes('Left');
        const isBack = key.includes('Back');
        drawHandOutline(ref.current, isLeft, isBack);
      }
    });
  }, [isClient]);

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

  const getStrokeColor = (symptomType) => {
    switch (symptomType) {
      case 'tingling': return '#9333ea';
      case 'numbness': return '#3b82f6';
      case 'pain': return '#f97316';
      default: return '#000000';
    }
  };

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
    ctx.fillStyle = getStrokeColor(symptomType);
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
      ctx.strokeStyle = getStrokeColor(symptomType);
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

  // ALL diagnostic questions are REQUIRED (including those with hasNotRelevant)
  // diagnosticEase, diagnosticComments, diagramEase, diagramComments are all OPTIONAL
  const handleNextSection = () => {
    if (currentSection === 0) {
      // Determine which questions are currently visible and need to be answered
      const visibleQuestions = diagnosticQuestions.filter(q => {
        // If question requires numbness/tingling, only visible if user said Yes to Q0
        if (q.requiresNumbnessOrTingling) {
          return hasNumbnessOrTingling === true;
        }
        return true;
      });
      
      const unanswered = visibleQuestions.filter(q => diagnosticAnswers[q.id] === undefined);
      
      if (unanswered.length > 0) {
        console.log('Unanswered required questions:', unanswered.map(q => q.id));
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

  const drawCombinedSymptoms = () => {
    ['Left', 'Right'].forEach(hand => {
      const canvasRef = hand === 'Left' ? resultsCanvasRefs.combinedLeft : resultsCanvasRefs.combinedRight;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      drawHandOutline(canvas, hand === 'Left', false);
      
      setTimeout(() => {
        ['tingling', 'numbness', 'pain'].forEach((symptom) => {
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
      }, 150);
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

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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
                // Skip dependent questions if user answered "No" to Q0
                if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === false) {
                  return null;
                }
                // Also skip dependent questions if Q0 hasn't been answered yet
                if (question.requiresNumbnessOrTingling && hasNumbnessOrTingling === null && question.id !== 0) {
                  return null;
                }

                // All visible questions are required
                const isIncomplete = highlightIncomplete && diagnosticAnswers[question.id] === undefined;
                
                return (
                  <div
                    key={question.id}
                    className={`bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${
                      isIncomplete
                        ? 'border-red-500 bg-red-50 animate-pulse'
                        : 'border-gray-200'
                    } ${question.hasNumbnessOrTingling ? 'border-blue-300 bg-blue-50' : ''}`}
                  >
                    <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                      <span className="flex-1">{question.text}</span>
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
                            setDiagnosticAnswers(newAnswers);
                            if (question.hasNumbnessOrTingling) {
                              setHasNumbnessOrTingling(true);
                            }
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
                            setDiagnosticAnswers(newAnswers);
                            if (question.hasNumbnessOrTingling) {
                              setHasNumbnessOrTingling(false);
                            }
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
              <div>
                <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                  <span>Was it easy to answer these questions about your hand symptoms?</span>
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
            </div>
          </div>
        );
      
      case 1:
        const allSymptoms = [
          { type: 'tingling', label: 'Tingling', instruction: 'Mark areas where you feel pins and needles or tingling sensations' },
          { type: 'numbness', label: 'Numbness', instruction: 'Mark areas where you have reduced or no sensation' },
          { type: 'pain', label: 'Pain', instruction: 'Mark areas where you experience pain or discomfort' }
        ];
        
        const symptoms = hasNumbnessOrTingling === false
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
                  <h3 className="text-2xl font-bold text-gray-800">{symptom.label}</h3>
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
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg touch-none"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontLeft`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontLeft`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontLeft`)}
                        onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}FrontLeft`)}
                        onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}FrontLeft`)}
                        onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}FrontLeft`)}
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
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg touch-none"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}FrontRight`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}FrontRight`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}FrontRight`)}
                        onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}FrontRight`)}
                        onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}FrontRight`)}
                        onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}FrontRight`)}
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
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg touch-none"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackLeft`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackLeft`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackLeft`)}
                        onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}BackLeft`)}
                        onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}BackLeft`)}
                        onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}BackLeft`)}
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
                        className="border-2 border-gray-300 rounded-lg cursor-crosshair shadow-md hover:shadow-lg touch-none"
                        onMouseDown={(e) => handleCanvasMouseDown(e, `${symptom.type}BackRight`)}
                        onMouseMove={(e) => handleCanvasMouseMove(e, `${symptom.type}BackRight`)}
                        onMouseUp={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                        onMouseLeave={(e) => handleCanvasMouseUp(e, `${symptom.type}BackRight`)}
                        onTouchStart={(e) => handleCanvasTouchStart(e, `${symptom.type}BackRight`)}
                        onTouchMove={(e) => handleCanvasTouchMove(e, `${symptom.type}BackRight`)}
                        onTouchEnd={(e) => handleCanvasTouchEnd(e, `${symptom.type}BackRight`)}
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
                <span>Was it easy to mark the diagrams?</span>
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

              <div className="mt-4">
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  If you have any comments on how to improve the hand diagrams, please write them below:
                </label>
                <textarea
                  value={diagramComments}
                  onChange={(e) => setDiagramComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Your feedback helps us improve the hand diagrams!"
                />
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">Assessment Result</h2>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-700" />
                <h4 className="font-bold text-blue-700">Important Note</h4>
              </div>
              <p className="text-sm text-blue-700">
                This assessment tool is for screening purposes only and should not replace professional medical diagnosis.
                If you have concerns about your symptoms, please consult with a healthcare provider for proper evaluation.
              </p>
            </div>

            {ctsScores && (
              <div className="space-y-6">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                    <h3 className="text-2xl font-bold mb-6 capitalize">{hand} Hand Assessment</h3>
                    
                    <div className={`p-6 rounded-lg mb-6 ${
                      ctsScores[hand].KatzScore.score === 3 ? 'bg-red-50 border-2 border-red-300' :
                      ctsScores[hand].KatzScore.score === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                      ctsScores[hand].KatzScore.score === 1 ? 'bg-yellow-50 border-2 border-yellow-300' :
                      'bg-green-50 border-2 border-green-300'
                    }`}>
                      <div className="flex gap-6">
                        <div className="flex-shrink-0">
                          <div className="space-y-2">
                            <canvas
                              ref={hand === 'left' ? resultsCanvasRefs.combinedLeft : resultsCanvasRefs.combinedRight}
                              width={CANVAS_WIDTH}
                              height={CANVAS_HEIGHT}
                              className="border-2 border-gray-400 rounded-lg shadow-md"
                              style={{width: '180px', height: '240px'}}
                            />
                            <div className="flex gap-2 justify-center text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(147, 51, 234, 0.7)'}}></div>
                                <span>Tingling</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(59, 130, 246, 0.7)'}}></div>
                                <span>Numbness</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(249, 115, 22, 0.7)'}}></div>
                                <span>Pain</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="mb-4">
                            <h4 className="font-semibold text-xl">Katz Classification:</h4>
                            <p className={`text-2xl font-bold ${
                              ctsScores[hand].KatzScore.score === 3 ? 'text-red-700' :
                              ctsScores[hand].KatzScore.score === 2 ? 'text-orange-700' :
                              ctsScores[hand].KatzScore.score === 1 ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {ctsScores[hand].KatzScore.classification} (Score: {ctsScores[hand].KatzScore.score})
                            </p>
                          </div>
                          <p className="text-lg mb-4">{ctsScores[hand].KatzScore.description}</p>
                          
                          <div className="p-3 bg-white/50 rounded-lg">
                            <p className="text-sm font-medium">
                              Affected median nerve digits: {
                                [
                                  ctsScores[hand].detailedCoverage?.thumb_distal > 5 ? 'Thumb' : null,
                                  (ctsScores[hand].detailedCoverage?.index_distal > 5 || ctsScores[hand].detailedCoverage?.index_middle >= 50) ? 'Index' : null,
                                  (ctsScores[hand].detailedCoverage?.middle_distal > 5 || ctsScores[hand].detailedCoverage?.middle_middle >= 50) ? 'Middle' : null,
                                ].filter(Boolean).join(', ') || 'None'
                              }
                            </p>
                            <p className="text-sm">
                              Palm involvement: {
                                (ctsScores[hand].detailedCoverage?.palm_radial > 5 || ctsScores[hand].detailedCoverage?.palm_ulnar > 5) 
                                  ? (ctsScores[hand].detailedCoverage?.palm_ulnar > 5 && !(ctsScores[hand].detailedCoverage?.palm_radial > 5) 
                                      ? 'Ulnar only (confined)' 
                                      : 'Yes') 
                                  : 'No'
                              }
                            </p>
                            <p className="text-sm">Dorsum involvement: {ctsScores[hand].detailedCoverage?.dorsum > 5 ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Coverage */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold text-lg mb-4">Detailed Coverage by Symptom Type</h4>
                      <div className="space-y-6">
                        {/* Thumb */}
                        <div className="border-l-4 border-red-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Thumb (Distal Phalanx):</h5>
                          <div className="space-y-2">
                            {['tingling', 'numbness', 'pain'].map(symptom => {
                              const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['thumb_distal'] || 0;
                              const isSignificant = coverage > 5;
                              return (
                                <div key={symptom}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="capitalize">{symptom}:</span>
                                    <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                      {coverage.toFixed(1)}%{isSignificant && ' ⚠️'}
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

                        {/* Index */}
                        <div className="border-l-4 border-green-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Index Finger:</h5>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx (any shading &gt;5%):</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%{isSignificant && ' ⚠️'}
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
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-2">Middle Phalanx (≥50% required):</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['index_middle'] || 0;
                                const isSignificant = coverage >= 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%{isSignificant && ' ⚠️'}
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

                        {/* Middle */}
                        <div className="border-l-4 border-blue-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Middle (Long) Finger:</h5>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx (any shading &gt;5%):</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%{isSignificant && ' ⚠️'}
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
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Middle Phalanx (≥50% required):</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].KatzScore.coverageBySymptom?.[symptom]?.['middle_middle'] || 0;
                                const isSignificant = coverage >= 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%{isSignificant && ' ⚠️'}
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

                        {/* Palm */}
                        <div className="border-l-4 border-yellow-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Palm:</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">Radial Side:</p>
                              <p className="text-lg font-bold">
                                {(ctsScores[hand].detailedCoverage?.palm_radial || 0).toFixed(1)}%
                                {(ctsScores[hand].detailedCoverage?.palm_radial || 0) > 5 && ' ⚠️'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">Ulnar Side:</p>
                              <p className="text-lg font-bold">
                                {(ctsScores[hand].detailedCoverage?.palm_ulnar || 0).toFixed(1)}%
                                {(ctsScores[hand].detailedCoverage?.palm_ulnar || 0) > 5 && ' ⚠️'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Dorsum */}
                        <div className="border-l-4 border-purple-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Dorsum (Back of Hand):</h5>
                          <p className="text-lg font-bold">
                            {(ctsScores[hand].detailedCoverage?.dorsum || 0).toFixed(1)}%
                            {(ctsScores[hand].detailedCoverage?.dorsum || 0) > 5 && ' ⚠️ (reduces classification)'}
                          </p>
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

          <div className="flex-1 bg-white rounded-2xl shadow-lg p-10">
            {renderSection()}

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