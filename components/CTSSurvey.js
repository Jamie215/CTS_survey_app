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
    { id: 11, text: "Do you have numbness or tingling in your toes?", requiresNumbnessOrTingling: true },
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
      const leftRegions = {};
      const rightRegions = {};
      
      // Load left hand SVG (already 300×400!)
      console.log('Loading left hand SVG...');
      const leftResponse = await fetch('/hands/hand_front_left.svg');
      if (!leftResponse.ok) {
        throw new Error(`Failed to load left SVG: ${leftResponse.status}`);
      }
      const leftSvgText = await leftResponse.text();
      const leftParser = new DOMParser();
      const leftSvgDoc = leftParser.parseFromString(leftSvgText, 'image/svg+xml');
      
      if (leftSvgDoc.querySelector('parsererror')) {
        throw new Error('Left SVG parsing failed');
      }
      
      // Load right hand SVG (already 300×400!)
      console.log('Loading right hand SVG...');
      const rightResponse = await fetch('/hands/hand_front_right.svg');
      if (!rightResponse.ok) {
        throw new Error(`Failed to load right SVG: ${rightResponse.status}`);
      }
      const rightSvgText = await rightResponse.text();
      const rightParser = new DOMParser();
      const rightSvgDoc = rightParser.parseFromString(rightSvgText, 'image/svg+xml');
      
      if (rightSvgDoc.querySelector('parsererror')) {
        throw new Error('Right SVG parsing failed');
      }
      
      // Process left hand paths - NO SCALING NEEDED!
      const leftPaths = leftSvgDoc.querySelectorAll('path');
      console.log('Left hand paths found:', leftPaths.length);
      
      leftPaths.forEach(path => {
        const label = path.getAttribute('inkscape:label') || 
                     path.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                     path.getAttribute('id');
        const d = path.getAttribute('d');
        
        if (label && d) {
          const path2D = new Path2D(d);
          leftRegions[label] = { path2D, pathString: d, label };
          console.log('✓ Left region:', label);
        }
      });
      
      // Process right hand paths - NO SCALING NEEDED!
      const rightPaths = rightSvgDoc.querySelectorAll('path');
      console.log('Right hand paths found:', rightPaths.length);
      
      rightPaths.forEach(path => {
        const label = path.getAttribute('inkscape:label') || 
                     path.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') ||
                     path.getAttribute('id');
        const d = path.getAttribute('d');
        
        if (label && d) {
          const path2D = new Path2D(d);
          rightRegions[label] = { path2D, pathString: d, label };
          console.log('✓ Right region:', label);
        }
      });
      
      console.log('✅ Loaded regions:', {
        left: Object.keys(leftRegions),
        right: Object.keys(rightRegions)
      });
      
      if (Object.keys(leftRegions).length === 0 && Object.keys(rightRegions).length === 0) {
        throw new Error('No valid regions found in SVG files');
      }
      
      setSvgRegions({
        leftFront: leftRegions,
        rightFront: rightRegions
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
      alert(`Error: ${error.message}\n\nCheck:\n1. /hands/hand_front_left.svg\n2. /hands/hand_front_right.svg`);
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
    flattenedDrawings.forEach(point => {
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

  // Calculate coverage of a region (single symptom)
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
      MNDSScore: {
        ...calculateMNDSScore(symptoms),
        coverageBySymptom: symptoms.coverageBySymptom
      },
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
  
  // Calculate individual symptom coverage for display
  ['tingling', 'numbness', 'pain'].forEach(symptomType => {
    const frontKey = `${symptomType}Front${hand}`;
    const frontData = handDiagramData[frontKey] || [];
    
    const requiredRegions = [
      'thumb_distal',
      'index_distal', 'index_middle',
      'middle_distal', 'middle_middle'
    ];
    
    requiredRegions.forEach(regionName => {
      const regionData = regions[regionName];
      if (!regionData) return;
      
      // Calculate individual symptom coverage
      const regionCoverage = calculateRegionCoverage(frontData, regionData.path2D);
      
      // Store coverage by symptom type (for display)
      coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
    });
  });
  
  // SECOND PASS: Calculate COMBINED coverage for scoring
  const requiredRegions = [
    'thumb_distal',
    'index_distal', 'index_middle',
    'middle_distal', 'middle_middle'
  ];
  
  requiredRegions.forEach(regionName => {
    const regionData = regions[regionName];
    if (!regionData) return;
    
    // Get drawings from ALL three symptom types
    const tinglingData = handDiagramData[`tinglingFront${hand}`] || [];
    const numbnessData = handDiagramData[`numbnessFront${hand}`] || [];
    const painData = handDiagramData[`painFront${hand}`] || [];
    
    // Calculate combined coverage (unique pixels from all three)
    const combinedCoverage = calculateCombinedRegionCoverage(
      [tinglingData, numbnessData, painData],
      regionData.path2D
    );
    
    // Store combined coverage for scoring
    coverage[regionName] = combinedCoverage.percentage;
  });

  // SCORING LOGIC (now using combined coverage from all three symptoms):
  let affectedDigits = 0;
  
  const thumbAffected = (coverage['thumb_distal'] || 0) > 5;
  if (thumbAffected) affectedDigits++;
  
  const indexMiddle50 = (coverage['index_middle'] || 0) > 50;
  const indexDistalSome = (coverage['index_distal'] || 0) > 5;
  const indexAffected = indexMiddle50 || indexDistalSome;
  if (indexAffected) affectedDigits++;
  
  const middleMiddle50 = (coverage['middle_middle'] || 0) > 50;
  const middleDistalSome = (coverage['middle_distal'] || 0) > 5;
  const middleAffected = middleMiddle50 || middleDistalSome;
  if (middleAffected) affectedDigits++;

  return {
    medianDigitsAffected: affectedDigits,
    detailedCoverage: coverage,  // Now contains combined coverage
    coverageBySymptom: coverageBySymptom,  // Still has individual breakdown
    digitDetails: {
      thumb: { affected: thumbAffected, distal: coverage['thumb_distal'] || 0 },
      index: { affected: indexAffected, distal: coverage['index_distal'] || 0, middle: coverage['index_middle'] || 0 },
      middle: { affected: middleAffected, distal: coverage['middle_distal'] || 0, middle: coverage['middle_middle'] || 0 }
    }
  };
};

  // MNDS CTS scoring method
  const calculateMNDSScore = (symptoms) => {
    const affected = symptoms.medianDigitsAffected;
    
    if (affected === 0) {
      return {
        score: 0,
        description: 'CTS is unlikely based on hand diagram'
      };
    } else if (affected === 1) {
      return {
        score: 1,
        description: 'Low probability of CTS. Consider other diagnoses or early-stage CTS.'
      };
    } else {
      // affected >= 2
      return {
        score: 2,
        description: 'Moderate to high probability of CTS. Further evaluation strongly recommended.'
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
  }, [currentSection, svgRegions]);

  // Render combined drawings on results page
  useEffect(() => {
    if (currentSection === 2 && ctsScores) {
      setTimeout(() => {
        renderCombinedDrawings(resultsCanvasRefs.combinedLeft, 'left');
        renderCombinedDrawings(resultsCanvasRefs.combinedRight, 'right');
      }, 100);
    }
  }, [currentSection, ctsScores]);

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
        return allQuestionsAnswered;
      
      case 1:
        return true;
      
      default:
        return true;
    }
  };

  const handleNextSection = () => {
    if (!isCurrentSectionComplete()) {
      setHighlightIncomplete(true);
      alert('Please complete all required fields before proceeding to the next section.');
      setTimeout(() => {
        const firstIncomplete = document.querySelector('.incomplete-question');
        if (firstIncomplete) {
          firstIncomplete.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
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
    // Cannot go back from results page (section 2)
    if (currentSection === 2) {
      return; // Results are locked
    }
    
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
      handDiagramData,
      diagramEase,
      ctsScores
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CTS_Survey_${participantId}.json`;
    a.click();
  };

  // Render combined symptoms on single canvas with color coding
  const renderCombinedDrawings = (canvasRef, hand) => {
    if (!canvasRef || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const isLeft = hand === 'left';
    
    // Capitalize first letter for key construction
    const handCapitalized = hand.charAt(0).toUpperCase() + hand.slice(1);
    
    // Draw hand outline first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    const imagePath = isLeft ? '/hands/hand_front_left.png' : '/hands/hand_front_right.png';
    
    img.onload = () => {
      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Define colors for each symptom type
      const symptomColors = {
        tingling: 'rgba(255, 0, 255, 0.7)',    // Magenta
        numbness: 'rgba(0, 0, 255, 0.7)',      // Blue
        pain: 'rgba(255, 165, 0, 0.7)'         // Orange
      };
      
      // Draw each symptom type with different color
      ['tingling', 'numbness', 'pain'].forEach(symptomType => {
        const frontKey = `${symptomType}Front${handCapitalized}`;
        const drawings = handDiagramData[frontKey];
        
        console.log(`Rendering ${frontKey}:`, drawings ? `${drawings.length} points` : 'no data');
        
        if (drawings && drawings.length > 0) {
          ctx.strokeStyle = symptomColors[symptomType];
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          let isDrawing = false;
          drawings.forEach(point => {
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
        }
      });
    };
    
    img.src = imagePath;
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
                // Skip numbness/tingling questions if user didn't answer "Yes" to screening question
                if (question.requiresNumbnessOrTingling && diagnosticAnswers[0] !== 'Yes') {
                  return null;
                }

                const isIncomplete = highlightIncomplete && !diagnosticAnswers[question.id];
                
                return (
                  <div
                    key={question.id}
                    className={`bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${
                      isIncomplete
                        ? 'border-red-500 bg-red-50 animate-pulse incomplete-question'
                        : 'border-gray-200'
                    } ${question.hasNumbnessOrTingling ? 'border-blue-300 bg-blue-50' : ''}`}
                  >
                    <p className="font-semibold mb-4 text-lg flex items-center gap-3">
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
                            if (question.hasNumbnessOrTingling) {
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
                            if (question.hasNumbnessOrTingling) {
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
                <label className="block text-lg font-semibold text-gray-800 mt-3 mb-3">
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
                <span>Was it easy to answer to mark the diagrams?</span>
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

              <div>
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
                    
                    {/* SCORE WITH EMBEDDED CANVAS */}
                    <div className={`p-6 rounded-lg mb-6 ${
                      ctsScores[hand].MNDSScore.score === 2 ? 'bg-red-50 border-2 border-red-300' :
                      ctsScores[hand].MNDSScore.score === 1 ? 'bg-yellow-50 border-2 border-yellow-300' :
                      'bg-green-50 border-2 border-green-300'
                    }`}>
                      <div className="flex gap-6">
                        {/* Left: Canvas */}
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
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(255, 0, 255, 0.7)'}}></div>
                                <span>Tingling</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(0, 0, 255, 0.7)'}}></div>
                                <span>Numbness</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{backgroundColor: 'rgba(255, 165, 0, 0.7)'}}></div>
                                <span>Pain</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Score Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-xl">Score:</h4>
                            <div className={`text-5xl font-bold ${
                              ctsScores[hand].MNDSScore.score === 2 ? 'text-red-700' :
                              ctsScores[hand].MNDSScore.score === 1 ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {ctsScores[hand].MNDSScore.score}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-lg">{ctsScores[hand].MNDSScore.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. DETAILED COVERAGE THIRD - BY SYMPTOM TYPE */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold text-lg mb-4">Detailed Coverage by Symptom Type</h4>
                      <p className="text-xs text-gray-600 mb-4">
                        * Scoring uses <strong>tingling/numbness only</strong>: Thumb affected if &gt;5% distal; Index/Middle affected if &gt;50% middle phalanx OR &gt;5% distal
                      </p>
                      
                      {/* Iterate through regions */}
                      <div className="space-y-6">
                        {/* Thumb */}
                        <div className="border-l-4 border-red-400 pl-4">
                          <h5 className="font-medium text-base mb-3">Thumb (Distal):</h5>
                          <div className="space-y-2">
                            {['tingling', 'numbness', 'pain'].map(symptom => {
                              const coverage = ctsScores[hand].MNDSScore.coverageBySymptom?.[symptom]?.['thumb_distal'] || 0;
                              const isSignificant = coverage > 5;
                              return (
                                <div key={symptom}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="capitalize">{symptom}:</span>
                                    <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                      {coverage.toFixed(1)}%
                                      {isSignificant && ' ✓'}
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
                          
                          {/* Index Distal */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-2">Distal Phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].MNDSScore.coverageBySymptom?.[symptom]?.['index_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant && ' ✓'}
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
                            <p className="text-sm font-medium text-gray-900 mb-2">Middle Phalanx:</p>
                            <div className="space-y-2">
                              {['tingling', 'numbness', 'pain'].map(symptom => {
                                const coverage = ctsScores[hand].MNDSScore.coverageBySymptom?.[symptom]?.['index_middle'] || 0;
                                const isSignificant = coverage > 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant && ' ✓'}
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
                                const coverage = ctsScores[hand].MNDSScore.coverageBySymptom?.[symptom]?.['middle_distal'] || 0;
                                const isSignificant = coverage > 5;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant && ' ✓'}
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
                                const coverage = ctsScores[hand].MNDSScore.coverageBySymptom?.[symptom]?.['middle_middle'] || 0;
                                const isSignificant = coverage > 50;
                                return (
                                  <div key={symptom}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="capitalize">{symptom}:</span>
                                      <span className={isSignificant ? 'font-bold text-red-600' : 'text-gray-600'}>
                                        {coverage.toFixed(1)}%
                                        {isSignificant && ' ✓'}
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
