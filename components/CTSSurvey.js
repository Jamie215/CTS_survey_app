"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand, Check, AlertCircle, Waves, CircleSlash, Zap } from 'lucide-react';

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

  // Refs for results display - combined symptom canvases (volar and dorsal)
  const resultsCanvasRefs = {
    combinedLeftVolar: useRef(null),
    combinedRightVolar: useRef(null),
    combinedLeftDorsal: useRef(null),
    combinedRightDorsal: useRef(null),
  };

  const diagnosticQuestions = [
    { id: 0, number: '1', text: "Do you ever have numbness and tingling in your fingers?", hasNumbnessOrTingling: true },
    { id: 1, number: '1a', text: "Do you wake up because of tingling or numbness in your fingers?", requiresNumbnessOrTingling: true },
    { id: 2, number: '1b', text: "Do you have tingling or numbness in your fingers when you first wake up?", requiresNumbnessOrTingling: true },
    { id: 3, number: '1c', text: "Is your numbness or tingling mainly in your thumb, index, and/or middle finger?", requiresNumbnessOrTingling: true },
    { id: 4, number: '1d', text: "Do you have any quick movements or positions that relieve your tingling or numbness?", requiresNumbnessOrTingling: true },
    { id: 5, number: '1e', text: "Do you have numbness or tingling in your little (small/pinky) finger?", requiresNumbnessOrTingling: true },
    { id: 6, number: '1f', text: "Do certain activities (for example, holding objects or repetitive finger movement) increase the numbness or tingling in your fingers?", requiresNumbnessOrTingling: true },
    { id: 7, number: '1g', text: "Did you have numbness or tingling in your fingers when you were pregnant? (If relevant)", hasNotRelevant: true, requiresNumbnessOrTingling: true },
    { id: 8, number: '2', text: "Do you wake up because of pain in your wrist?" },
    { id: 9, number: '3', text: "Do you drop small objects like coins or a cup?" },
    { id: 10, number: '4', text: "Do you often have neck pain?" },
    { id: 11, number: '5', text: "Do you have numbness or tingling in your toes?" },
    { id: 12, number: '6', text: "Have your symptoms improved with using wrist support brace or splint? (If relevant)", hasNotRelevant: true }
  ];

  const sections = [
    { id: 0, title: "Diagnostic Questions" },
    { id: 1, title: "Hand Diagrams" },
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
    // Check by red channel value (R, G, B, A)
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
    // Check by red channel value (R, G, B, A)
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

  // Re-initialize canvases when navigating to hand digram section
  useEffect(() => {
    if (currentSection === 1) {
      // Small delay to ensure canvases are mounted
      const timer = setTimeout(() => {
        Object.entries(canvasRefs).forEach(([key, ref]) => {
          if (ref.current) {
            const isLeft = key.includes('Left');
            const isBack = key.includes('Back');
            
            // Only draw if canvas doesn't already have drawing data
            // (to preserve user's drawings if they go back and forth)
            const existingData = handDiagramData[key];
            if (!existingData || existingData.length === 0) {
              drawHandOutline(ref.current, isLeft, isBack);
            } else {
              // Redraw the hand outline first, then redraw the user's strokes
              drawHandOutline(ref.current, isLeft, isBack);
              
              // Wait for image to load, then redraw strokes
              setTimeout(() => {
                const canvas = ref.current;
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                const symptomType = getSymptomType(key);
                ctx.strokeStyle = getStrokeColor(symptomType);
                ctx.lineWidth = 12;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                let isDrawing = false;
                existingData.forEach(point => {
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
              }, 150);
            }
          }
        });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentSection]);


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

  // Helper function to draw symptoms on a canvas
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
  };

  const drawCombinedSymptoms = () => {
    ['Left', 'Right'].forEach(hand => {
      // Draw volar (front/palm) view
      const volarRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar;
      drawSymptomsOnCanvas(volarRef.current, hand, false);
      
      // Draw dorsal (back) view
      const dorsalRef = hand === 'Left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal;
      drawSymptomsOnCanvas(dorsalRef.current, hand, true);
    });
  };

  // Re-initialize results canvases when navigating to Results section (Page 3)
  useEffect(() => {
    if (currentSection === 2) {
      // Small delay to ensure canvases are mounted
      const timer = setTimeout(() => {
        drawCombinedSymptoms();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentSection]);

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

            {/* Questions Container - Single Background */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-6">
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
                  const isSubQuestion = question.number.includes('a') || question.number.includes('b') || 
                                        question.number.includes('c') || question.number.includes('d') ||
                                        question.number.includes('e') || question.number.includes('f') ||
                                        question.number.includes('g');
                  
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
                        <label className="flex items-center cursor-pointer group">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            diagnosticAnswers[question.id] === 'Yes' 
                              ? 'border-purple-600 bg-purple-600' 
                              : 'border-gray-400 group-hover:border-purple-400'
                          }`}>
                            {diagnosticAnswers[question.id] === 'Yes' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            )}
                          </div>
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
                            className="sr-only"
                          />
                          <span className={`ml-2 text-lg font-medium ${
                            diagnosticAnswers[question.id] === 'Yes' ? 'text-purple-600' : 'text-gray-600'
                          }`}>Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            diagnosticAnswers[question.id] === 'No' 
                              ? 'border-purple-600 bg-purple-600' 
                              : 'border-gray-400 group-hover:border-purple-400'
                          }`}>
                            {diagnosticAnswers[question.id] === 'No' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            )}
                          </div>
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
                            className="sr-only"
                          />
                          <span className={`ml-2 text-lg font-medium ${
                            diagnosticAnswers[question.id] === 'No' ? 'text-purple-600' : 'text-gray-600'
                          }`}>No</span>
                        </label>
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
                  placeholder="Your feedback helps us improve this survey..."
                />
              </div>
            </div>
          </div>
        );
      
      case 1:
        const allSymptoms = [
          { type: 'tingling', label: 'Tingling', color: 'purple', icon: Waves, instruction: 'Mark areas where you feel pins and needles or tingling sensations' },
          { type: 'numbness', label: 'Numbness', color: 'blue', icon: CircleSlash, instruction: 'Mark areas where you have reduced or no sensation' },
          { type: 'pain', label: 'Pain', color: 'orange', icon: Zap, instruction: 'Mark areas where you experience pain or discomfort' }
        ];
        
        const symptoms = hasNumbnessOrTingling === false
          ? allSymptoms.filter(s => s.type === 'pain')
          : allSymptoms;

        return (
          <div className="space-y-6">
            {/* Section Header */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Hand Diagrams
              </h2>
              <p className="text-lg text-gray-600">
                Please mark the areas where you experience for each symptoms (tingling, numbness, pain) on the corresponding hand diagrams below. 
                Use your mouse or finger to draw on the hand images.
              </p>
            </div>

            {symptoms.map((symptom, symptomIndex) => (
              <div key={symptom.type} className="bg-gray-50 rounded-xl p-6">
                {/* Symptom Header */}
                <div className="mb-6">
                  <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                    symptom.type === 'tingling' ? 'text-purple-600' :
                    symptom.type === 'numbness' ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {symptomIndex + 1}. <symptom.icon className="w-5 h-5 inline" /> {symptom.label}
                  </h3>
                  <p className="text-lg text-gray-600 mt-1" style={{ fontStyle: 'italic' }}>{symptom.instruction}</p>
                </div>

                {/* Volar (Palm) View */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Palm side (Volar view):</h4>
                  <div className="flex gap-8 justify-center flex-wrap">
                    <div className="text-center">
                      <p className="mb-2 text-lg font-medium text-gray-700">Left Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}FrontLeft`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                        style={{width: '200px', height: '267px'}}
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
                        className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-2 text-lg font-medium text-gray-700">Right Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}FrontRight`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                        style={{width: '200px', height: '267px'}}
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
                        className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dorsal (Back) View */}
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-4">Back of hands (Dorsal view):</h4>
                  <div className="flex gap-8 justify-center flex-wrap">
                    <div className="text-center">
                      <p className="mb-2 text-lg font-medium text-gray-700">Left Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}BackLeft`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                        style={{width: '200px', height: '267px'}}
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
                        className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="mb-2 text-lg font-medium text-gray-700">Right Hand</p>
                      <canvas
                        ref={canvasRefs[`${symptom.type}BackRight`]}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
                        style={{width: '200px', height: '267px'}}
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
                        className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Optional Feedback Section */}
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div>
                <p className="text-lg font-medium mb-3 text-gray-800">
                  Was it easy to mark the diagrams?
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
                  placeholder="Your feedback helps us improve the hand diagrams..."
                />
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            {/* Section Header */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Assessment Results
              </h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-lg font-medium text-purple-800">Important Note</p>
                    <p className="text-lg text-purple-700">
                      This assessment tool is for screening purposes only and should not replace professional medical diagnosis.
                      If you have concerns about your symptoms, please consult with a healthcare provider for proper evaluation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {ctsScores && (
              <div className="space-y-6">
                {['left', 'right'].map((hand) => (
                  <div key={hand} className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 capitalize text-gray-800">{hand} Hand Assessment</h3>
                    
                    <div className={`p-4 rounded-lg mb-4 ${
                      ctsScores[hand].KatzScore.score === 3 ? 'bg-red-50 border border-red-200' :
                      ctsScores[hand].KatzScore.score === 2 ? 'bg-orange-50 border border-orange-200' :
                      ctsScores[hand].KatzScore.score === 1 ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex gap-6 flex-wrap">
                        <div className="flex-shrink-0">
                          <div className="space-y-3">
                            {/* Two canvases side by side: Volar and Dorsal */}
                            <div className="flex gap-3">
                              {/* Volar (Palm) View */}
                              <div className="text-center">
                                <p className="text-base font-medium text-gray-600 mb-1">Palm (Volar)</p>
                                <canvas
                                  ref={hand === 'left' ? resultsCanvasRefs.combinedLeftVolar : resultsCanvasRefs.combinedRightVolar}
                                  width={CANVAS_WIDTH}
                                  height={CANVAS_HEIGHT}
                                  className="border border-gray-300 rounded-lg bg-white"
                                  style={{width: '140px', height: '187px'}}
                                />
                              </div>
                              {/* Dorsal (Back) View */}
                              <div className="text-center">
                                <p className="text-base font-medium text-gray-600 mb-1">Back (Dorsal)</p>
                                <canvas
                                  ref={hand === 'left' ? resultsCanvasRefs.combinedLeftDorsal : resultsCanvasRefs.combinedRightDorsal}
                                  width={CANVAS_WIDTH}
                                  height={CANVAS_HEIGHT}
                                  className="border border-gray-300 rounded-lg bg-white"
                                  style={{width: '140px', height: '187px'}}
                                />
                              </div>
                            </div>
                            {/* Legend */}
                            <div className="flex gap-3 justify-center text-base">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(147, 51, 234, 0.7)'}}></div>
                                <span className="text-gray-600"> Tingling</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(59, 130, 246, 0.7)'}}></div>
                                <span className="text-gray-600">Numbness</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(249, 115, 22, 0.7)'}}></div>
                                <span className="text-gray-600">Pain</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-[200px]">
                          <div className="mb-3">
                            <p className="text-lg font-medium text-gray-600">Katz Classification:</p>
                            <p className={`text-2xl font-bold ${
                              ctsScores[hand].KatzScore.score === 3 ? 'text-red-700' :
                              ctsScores[hand].KatzScore.score === 2 ? 'text-orange-700' :
                              ctsScores[hand].KatzScore.score === 1 ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {ctsScores[hand].KatzScore.classification} (Score: {ctsScores[hand].KatzScore.score})
                            </p>
                          </div>
                          <p className="text-lg text-gray-700 mb-3">{ctsScores[hand].KatzScore.description}</p>
                          
                          <div className="text-lg space-y-1">
                            <p>
                              <span className="font-medium">Affected digits:</span>{' '}
                              {[
                                ctsScores[hand].detailedCoverage?.thumb_distal > 5 ? 'Thumb' : null,
                                (ctsScores[hand].detailedCoverage?.index_distal > 5 || ctsScores[hand].detailedCoverage?.index_middle >= 50) ? 'Index' : null,
                                (ctsScores[hand].detailedCoverage?.middle_distal > 5 || ctsScores[hand].detailedCoverage?.middle_middle >= 50) ? 'Middle' : null,
                              ].filter(Boolean).join(', ') || 'None'}
                            </p>
                            <p>
                              <span className="font-medium">Palm:</span>{' '}
                              {(ctsScores[hand].detailedCoverage?.palm_radial > 5 || ctsScores[hand].detailedCoverage?.palm_ulnar > 5) 
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
                        </div>
                      </div>
                    </div>

                    {/* Detailed Coverage - Collapsible or simplified */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-lg font-medium text-purple-600 hover:text-purple-800">
                        View detailed coverage breakdown
                      </summary>
                      <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                          {/* Thumb */}
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
                          {/* Index */}
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
                          {/* Middle */}
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
                          {/* Palm & Dorsum */}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-gray-50 pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-normal text-gray-800">
            Carpal Tunnel Syndrome Diagnostic Tool
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stepper Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                {/* Step - fixed width for equal spacing */}
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
                {/* Connector Line - positioned between steps */}
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