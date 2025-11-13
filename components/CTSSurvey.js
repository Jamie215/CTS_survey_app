"use client"

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Hand, Check, AlertCircle } from 'lucide-react';

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
  const [ctsScores, setCtsScores] = useState(null);
  const [hasNumbnessOrTingling, setHasNumbnessOrTingling] = useState(null);
  
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

  // Helper function to check if point is inside rotated rectangle
  const isPointInRotatedRect = (point, region) => {
    const {center, width, height, rotation = 0} = region;
    const rad = rotation * Math.PI / 180;
    
    // Translate point to origin
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    
    // Rotate point back
    const rotX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
    const rotY = dx * Math.sin(-rad) + dy * Math.cos(-rad);
    
    // Check if in axis-aligned rectangle
    return Math.abs(rotX) <= width / 2 && Math.abs(rotY) <= height / 2;
  };

  // Helper function to check if point is inside polygon
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Detailed anatomical regions for LEFT hand (palm view)
  // Using rotated rectangles for diagonal fingers and polygons for irregular areas
  // Coordinates scaled for 300x400 canvas (original image is 650x600 per hand, scaled to ~300x277)
  const leftHandRegionsFront = {
    thumb: {
      distal: { 
        type: 'rect',
        center: { x: 53, y: 136 },
        width: 19,
        height: 25,
        rotation: -45  // Thumb angles outward
      },
      proximal: { 
        type: 'rect',
        center: { x: 41, y: 162 },
        width: 23,
        height: 32,
        rotation: -30
      },
      thenar: { 
        type: 'polygon',
        points: [
          {x: 21, y: 173}, {x: 55, y: 176}, 
          {x: 60, y: 217}, {x: 23, y: 222}
        ]
      }
    },
    index: {
      distal: { 
        type: 'rect',
        center: { x: 76, y: 58 },
        width: 14,
        height: 23,
        rotation: -3
      },
      middle: { 
        type: 'rect',
        center: { x: 76, y: 83 },
        width: 15,
        height: 25,
        rotation: -3
      },
      proximal: { 
        type: 'rect',
        center: { x: 76, y: 113 },
        width: 17,
        height: 32,
        rotation: -3
      }
    },
    middle: {
      distal: { 
        type: 'rect',
        center: { x: 101, y: 48 },
        width: 15,
        height: 25,
        rotation: 0
      },
      middle: { 
        type: 'rect',
        center: { x: 101, y: 76 },
        width: 16,
        height: 28,
        rotation: 0
      },
      proximal: { 
        type: 'rect',
        center: { x: 100, y: 108 },
        width: 18,
        height: 35,
        rotation: 0
      }
    },
    ring: {
      distal: { 
        type: 'rect',
        center: { x: 126, y: 53 },
        width: 14,
        height: 23,
        rotation: 3
      },
      middle: { 
        type: 'rect',
        center: { x: 126, y: 78 },
        width: 15,
        height: 25,
        rotation: 3
      },
      proximal: { 
        type: 'rect',
        center: { x: 125, y: 108 },
        width: 17,
        height: 32,
        rotation: 3
      }
    },
    pinky: {
      distal: { 
        type: 'rect',
        center: { x: 149, y: 71 },
        width: 12,
        height: 21,
        rotation: 15  // Pinky angles outward
      },
      middle: { 
        type: 'rect',
        center: { x: 146, y: 94 },
        width: 13,
        height: 23,
        rotation: 12
      },
      proximal: { 
        type: 'rect',
        center: { x: 142, y: 122 },
        width: 15,
        height: 30,
        rotation: 10
      }
    },
    palm: {
      central: { 
        type: 'polygon',
        points: [
          {x: 60, y: 138}, {x: 133, y: 138},
          {x: 131, y: 194}, {x: 57, y: 194}
        ]
      },
      hypothenar: { 
        type: 'polygon',
        points: [
          {x: 133, y: 143}, {x: 161, y: 143},
          {x: 163, y: 208}, {x: 131, y: 208}
        ]
      }
    },
    wrist: { 
      type: 'polygon',
      points: [
        {x: 55, y: 222}, {x: 138, y: 222},
        {x: 142, y: 277}, {x: 51, y: 277}
      ]
    }
  };

  // RIGHT hand regions (palm view) - mirror of left
  // Coordinates scaled for 300x400 canvas
  const rightHandRegionsFront = {
    thumb: {
      distal: { 
        type: 'rect',
        center: { x: 247, y: 136 },
        width: 19,
        height: 25,
        rotation: 45  // Mirror rotation
      },
      proximal: { 
        type: 'rect',
        center: { x: 259, y: 162 },
        width: 23,
        height: 32,
        rotation: 30
      },
      thenar: { 
        type: 'polygon',
        points: [
          {x: 279, y: 173}, {x: 245, y: 176}, 
          {x: 240, y: 217}, {x: 277, y: 222}
        ]
      }
    },
    index: {
      distal: { 
        type: 'rect',
        center: { x: 224, y: 58 },
        width: 14,
        height: 23,
        rotation: 3
      },
      middle: { 
        type: 'rect',
        center: { x: 224, y: 83 },
        width: 15,
        height: 25,
        rotation: 3
      },
      proximal: { 
        type: 'rect',
        center: { x: 224, y: 113 },
        width: 17,
        height: 32,
        rotation: 3
      }
    },
    middle: {
      distal: { 
        type: 'rect',
        center: { x: 199, y: 48 },
        width: 15,
        height: 25,
        rotation: 0
      },
      middle: { 
        type: 'rect',
        center: { x: 199, y: 76 },
        width: 16,
        height: 28,
        rotation: 0
      },
      proximal: { 
        type: 'rect',
        center: { x: 200, y: 108 },
        width: 18,
        height: 35,
        rotation: 0
      }
    },
    ring: {
      distal: { 
        type: 'rect',
        center: { x: 174, y: 53 },
        width: 14,
        height: 23,
        rotation: -3
      },
      middle: { 
        type: 'rect',
        center: { x: 174, y: 78 },
        width: 15,
        height: 25,
        rotation: -3
      },
      proximal: { 
        type: 'rect',
        center: { x: 175, y: 108 },
        width: 17,
        height: 32,
        rotation: -3
      }
    },
    pinky: {
      distal: { 
        type: 'rect',
        center: { x: 151, y: 71 },
        width: 12,
        height: 21,
        rotation: -15  // Mirror rotation
      },
      middle: { 
        type: 'rect',
        center: { x: 154, y: 94 },
        width: 13,
        height: 23,
        rotation: -12
      },
      proximal: { 
        type: 'rect',
        center: { x: 158, y: 122 },
        width: 15,
        height: 30,
        rotation: -10
      }
    },
    palm: {
      central: { 
        type: 'polygon',
        points: [
          {x: 240, y: 138}, {x: 167, y: 138},
          {x: 169, y: 194}, {x: 243, y: 194}
        ]
      },
      hypothenar: { 
        type: 'polygon',
        points: [
          {x: 167, y: 143}, {x: 139, y: 143},
          {x: 137, y: 208}, {x: 169, y: 208}
        ]
      }
    },
    wrist: { 
      type: 'polygon',
      points: [
        {x: 245, y: 222}, {x: 162, y: 222},
        {x: 158, y: 277}, {x: 249, y: 277}
      ]
    }
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
    { id: 11, text: "Do you have numbness or tingling in your toes?" },
    { id: 12, text: "Have your symptoms improved with using wrist support brace or splint? (If relevant)", hasNotRelevant: true }
  ];

  const sections = [
    { id: 0, title: "Section 1" },
    { id: 1, title: "Section 2" },
    { id: 2, title: "Result" },
  ];

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
      katzScore: calculateKatzScore(symptoms),
      mndsScore: calculateMNDSScore(symptoms),
      individualDigits: {
        thumb: symptoms.thumb,
        index: symptoms.index,
        middle: symptoms.middle
      },
      detailedFingerAnalysis: symptoms.detailedFingers,
      riskLevel: determineRiskLevel(symptoms)
    };
  };

  const analyzeSymptomDistribution = (hand) => {
    const symptoms = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      palm: false,
      wrist: false,
      dorsum: false,
      detailedFingers: {
        thumb: { distal: false, proximal: false },
        index: { distal: false, middle: false, proximal: false },
        middle: { distal: false, middle: false, proximal: false },
        ring: { distal: false, middle: false, proximal: false },
        pinky: { distal: false, middle: false, proximal: false }
      }
    };

    // Select appropriate regions based on hand side
    const regions = hand === 'Left' ? leftHandRegionsFront : rightHandRegionsFront;

    // Check each symptom type (tingling, numbness, pain)
    ['tingling', 'numbness', 'pain'].forEach(symptomType => {
      // Check front view
      const frontKey = `${symptomType}Front${hand}`;
      const frontData = handDiagramData[frontKey] || [];
      
      // Check back view
      const backKey = `${symptomType}Back${hand}`;
      const backData = handDiagramData[backKey] || [];

      // Analyze front (palm) view points
      frontData.forEach(point => {
        if (point.type === 'draw' || point.type === 'start') {
          // Check thumb regions
          if (isPointInRegion(point, regions.thumb.distal)) {
            symptoms.thumb = true;
            symptoms.detailedFingers.thumb.distal = true;
          }
          if (isPointInRegion(point, regions.thumb.proximal)) {
            symptoms.thumb = true;
            symptoms.detailedFingers.thumb.proximal = true;
          }

          // Check index finger regions
          if (isPointInRegion(point, regions.index.distal)) {
            symptoms.index = true;
            symptoms.detailedFingers.index.distal = true;
          }
          if (isPointInRegion(point, regions.index.middle)) {
            symptoms.index = true;
            symptoms.detailedFingers.index.middle = true;
          }
          if (isPointInRegion(point, regions.index.proximal)) {
            symptoms.index = true;
            symptoms.detailedFingers.index.proximal = true;
          }

          // Check middle finger regions - MOST IMPORTANT FOR CTS
          if (isPointInRegion(point, regions.middle.distal)) {
            symptoms.middle = true;
            symptoms.detailedFingers.middle.distal = true;
          }
          if (isPointInRegion(point, regions.middle.middle)) {
            symptoms.middle = true;
            symptoms.detailedFingers.middle.middle = true;
          }
          if (isPointInRegion(point, regions.middle.proximal)) {
            symptoms.middle = true;
            symptoms.detailedFingers.middle.proximal = true;
          }

          // Check ring finger
          if (isPointInRegion(point, regions.ring.distal) ||
              isPointInRegion(point, regions.ring.middle) ||
              isPointInRegion(point, regions.ring.proximal)) {
            symptoms.ring = true;
          }

          // Check pinky
          if (isPointInRegion(point, regions.pinky.distal) ||
              isPointInRegion(point, regions.pinky.middle) ||
              isPointInRegion(point, regions.pinky.proximal)) {
            symptoms.pinky = true;
          }

          // Check palm
          if (isPointInRegion(point, regions.palm.central)) {
            symptoms.palm = true;
          }

          // Check wrist
          if (isPointInRegion(point, regions.wrist)) {
            symptoms.wrist = true;
          }
        }
      });

      // Any back view data indicates dorsum involvement
      if (backData.length > 5) { // More than 5 points to avoid accidental clicks
        symptoms.dorsum = true;
      }
    });

    return symptoms;
  };

  // Universal helper function to check if a point is within a region
  const isPointInRegion = (point, region) => {
    if (!region) return false;
    
    if (region.type === 'rect') {
      return isPointInRotatedRect(point, region);
    } else if (region.type === 'polygon') {
      return isPointInPolygon(point, region.points);
    }
    
    // Fallback for old format (shouldn't be needed with new regions)
    if (region.x && region.y) {
      return point.x >= region.x[0] && point.x <= region.x[1] &&
             point.y >= region.y[0] && point.y <= region.y[1];
    }
    
    return false;
  };

  // Implement Katz scoring algorithm with detailed finger analysis
  const calculateKatzScore = (symptoms) => {
    const medianNerveDigits = [symptoms.thumb, symptoms.index, symptoms.middle];
    const affectedMedianDigits = medianNerveDigits.filter(d => d).length;

    // Check for distal volar shading as required by Katz
    const hasProperDistalShading = 
      (symptoms.detailedFingers.index.distal || symptoms.detailedFingers.index.middle) ||
      (symptoms.detailedFingers.middle.distal || symptoms.detailedFingers.middle.middle) ||
      symptoms.detailedFingers.thumb.distal;

    // Classic: symptoms in at least 2 median digits with proper distal shading, no palm or dorsum
    if (affectedMedianDigits >= 2 && hasProperDistalShading && !symptoms.palm && !symptoms.dorsum) {
      return { level: 'Classic', score: 3, description: 'High probability of CTS' };
    }
    
    // Probable: symptoms in at least 2 median digits with proper shading, palm symptoms allowed
    if (affectedMedianDigits >= 2 && hasProperDistalShading && symptoms.palm && !symptoms.dorsum) {
      return { level: 'Probable', score: 2, description: 'Moderate-high probability of CTS' };
    }
    
    // Possible: symptoms in at least 1 median digit
    if (affectedMedianDigits >= 1) {
      return { level: 'Possible', score: 1, description: 'Low-moderate probability of CTS' };
    }
    
    // Unlikely: no median nerve distribution symptoms
    return { level: 'Unlikely', score: 0, description: 'Low probability of CTS' };
  };

  // Calculate Median Nerve Digit Score (MNDS)
  const calculateMNDSScore = (symptoms) => {
    const count = [symptoms.thumb, symptoms.index, symptoms.middle].filter(d => d).length;
    return {
      score: count,
      interpretation: count >= 2 ? 'Positive for CTS screening' : 'Negative for CTS screening'
    };
  };

  // Determine overall risk level with emphasis on middle finger
  const determineRiskLevel = (symptoms) => {
    // Based on paper: middle finger is most sensitive, especially distal/middle phalanx
    const middleFingerInvolvement = symptoms.detailedFingers.middle.distal || 
                                   symptoms.detailedFingers.middle.middle;

    if (middleFingerInvolvement) {
      if (symptoms.thumb || symptoms.index) {
        return { level: 'High', color: 'red', message: 'Strong indication for CTS - consider medical evaluation' };
      }
      return { level: 'Moderate', color: 'yellow', message: 'Possible CTS - monitor symptoms closely' };
    }
    
    if (symptoms.thumb && symptoms.index) {
      return { level: 'Moderate', color: 'yellow', message: 'Possible CTS - monitor symptoms' };
    }
    
    if (symptoms.thumb || symptoms.index) {
      return { level: 'Low', color: 'green', message: 'Low risk but monitor if symptoms persist' };
    }
    
    return { level: 'Minimal', color: 'green', message: 'No significant median nerve involvement detected' };
  };

  const drawHandOutline = (canvas, isLeft = false, isFront = true) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const imagePath = isFront ? 'hands/hands_front.png' : 'hands/hands_back.png';

    img.onload = () => {
      // Draw the appropriate hand from the image
      if (isFront) {
        // For front view, left hand is on left, right hand is on right
        const sourceX = isLeft ? 0 : img.width / 2;
        ctx.drawImage(
          img,
          sourceX, 0, img.width / 2, img.height,
          0, 0, canvas.width, canvas.height
        );
      } else {
        // For back view
        const sourceX = isLeft ? 0 : img.width / 2;
        ctx.drawImage(
          img,
          sourceX, 0, img.width / 2, img.height,
          0, 0, canvas.width, canvas.height
        );
      }

      // Add semi-transparent overlays to highlight key median nerve areas
      if (isFront) {
        // Highlight median nerve distribution areas
        const regions = isLeft ? leftHandRegionsFront : rightHandRegionsFront;
        
        // Helper to draw rotated rectangle highlight
        const drawRotatedRectHighlight = (region, fillStyle) => {
          if (region.type === 'rect') {
            ctx.save();
            ctx.fillStyle = fillStyle;
            ctx.translate(region.center.x, region.center.y);
            ctx.rotate((region.rotation || 0) * Math.PI / 180);
            ctx.fillRect(-region.width / 2, -region.height / 2, region.width, region.height);
            ctx.restore();
          }
        };
        
        // Thumb area (lighter yellow)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        drawRotatedRectHighlight(regions.thumb.distal, 'rgba(255, 255, 0, 0.1)');
        drawRotatedRectHighlight(regions.thumb.proximal, 'rgba(255, 255, 0, 0.1)');
        
        // Index finger
        drawRotatedRectHighlight(regions.index.distal, 'rgba(255, 255, 0, 0.1)');
        drawRotatedRectHighlight(regions.index.middle, 'rgba(255, 255, 0, 0.1)');
        
        // Middle finger (most important - stronger highlight)
        drawRotatedRectHighlight(regions.middle.distal, 'rgba(255, 200, 0, 0.15)');
        drawRotatedRectHighlight(regions.middle.middle, 'rgba(255, 200, 0, 0.15)');
      }
    };
    img.src = imagePath;
  };

  useEffect(() => {
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
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // Red for symptoms
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
      const isFront = canvasKey.includes('Front');
      drawHandOutline(canvas, isLeft, isFront);
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
          // Always include non-conditional questions
          if (!question.requiresNumbnessOrTingling) return true;
          // Only include numbness/tingling questions if screening answer is "Yes"
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
                            // If screening question changes to "Yes", update state
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
                            // If screening question changes to "No", update state
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
        
        // If user answered "No" to screening question, exclude tingling and numbness
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
                        width={300}
                        height={400}
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
                        width={300}
                        height={400}
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
                        width={300}
                        height={400}
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
                        width={300}
                        height={400}
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

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
              <div className={`${highlightIncomplete && diagramEase === '' ? 'bg-red-50 border-red-500 border-2 rounded-lg p-4' : ''}`}>
                <p className="font-semibold mb-4 text-lg flex items-center gap-3">
                  {getQuestionIndicator(diagramEase !== '')}
                  <span>How easy was it to mark your symptoms on the hand diagrams?</span>
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

      case 2:
        return (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-3">
                Your CTS Assessment Results
              </h2>
            </div>

            {ctsScores && (
              <div className="grid md:grid-cols-2 gap-8">
                {['left', 'right'].map(hand => (
                  <div key={hand} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 capitalize flex items-center gap-2">
                      {hand} Hand Assessment
                    </h3>
                    
                    {/* Katz Score */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">Katz Classification:</h4>
                      <div className={`text-2xl font-bold mb-1 ${
                        ctsScores[hand].katzScore.score >= 2 ? 'text-red-600' :
                        ctsScores[hand].katzScore.score === 1 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {ctsScores[hand].katzScore.level}
                      </div>
                      <p className="text-sm text-gray-600">{ctsScores[hand].katzScore.description}</p>
                    </div>

                    {/* MNDS Score */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">Median Nerve Digit Score:</h4>
                      <div className="text-2xl font-bold mb-1">
                        {ctsScores[hand].mndsScore.score}/3
                      </div>
                      <p className={`text-sm ${
                        ctsScores[hand].mndsScore.score >= 2 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {ctsScores[hand].mndsScore.interpretation}
                      </p>
                    </div>

                    {/* Detailed Finger Analysis */}
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-lg mb-3">Detailed Finger Analysis:</h4>
                      <div className="space-y-3">
                        {/* Thumb */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-4 h-4 rounded-full ${ctsScores[hand].individualDigits.thumb ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <span className="font-medium">Thumb</span>
                          </div>
                          {ctsScores[hand].individualDigits.thumb && (
                            <div className="ml-6 text-sm text-gray-600">
                              Distal: {ctsScores[hand].detailedFingerAnalysis.thumb.distal ? '✓' : '✗'} | 
                              Proximal: {ctsScores[hand].detailedFingerAnalysis.thumb.proximal ? '✓' : '✗'}
                            </div>
                          )}
                        </div>

                        {/* Index */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-4 h-4 rounded-full ${ctsScores[hand].individualDigits.index ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <span className="font-medium">Index</span>
                          </div>
                          {ctsScores[hand].individualDigits.index && (
                            <div className="ml-6 text-sm text-gray-600">
                              Distal: {ctsScores[hand].detailedFingerAnalysis.index.distal ? '✓' : '✗'} | 
                              Middle: {ctsScores[hand].detailedFingerAnalysis.index.middle ? '✓' : '✗'} | 
                              Proximal: {ctsScores[hand].detailedFingerAnalysis.index.proximal ? '✓' : '✗'}
                            </div>
                          )}
                        </div>

                        {/* Middle */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-4 h-4 rounded-full ${ctsScores[hand].individualDigits.middle ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <span className="font-medium">Middle (Long)</span>
                            {ctsScores[hand].individualDigits.middle && (
                              <span className="text-xs bg-yellow-100 px-2 py-1 rounded-full">Most sensitive</span>
                            )}
                          </div>
                          {ctsScores[hand].individualDigits.middle && (
                            <div className="ml-6 text-sm text-gray-600">
                              Distal: {ctsScores[hand].detailedFingerAnalysis.middle.distal ? '✓' : '✗'} | 
                              Middle: {ctsScores[hand].detailedFingerAnalysis.middle.middle ? '✓' : '✗'} | 
                              Proximal: {ctsScores[hand].detailedFingerAnalysis.middle.proximal ? '✓' : '✗'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Risk Level */}
                    <div className={`p-4 rounded-lg ${
                      ctsScores[hand].riskLevel.color === 'red' ? 'bg-red-50 border-2 border-red-300' :
                      ctsScores[hand].riskLevel.color === 'yellow' ? 'bg-yellow-50 border-2 border-yellow-300' :
                      'bg-green-50 border-2 border-green-300'
                    }`}>
                      <h4 className="font-semibold text-lg mb-2">Overall Risk Assessment:</h4>
                      <div className={`text-xl font-bold mb-1 ${
                        ctsScores[hand].riskLevel.color === 'red' ? 'text-red-700' :
                        ctsScores[hand].riskLevel.color === 'yellow' ? 'text-yellow-700' :
                        'text-green-700'
                      }`}>
                        {ctsScores[hand].riskLevel.level} Risk
                      </div>
                      <p className="text-sm">{ctsScores[hand].riskLevel.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-100 border-l-4 border-blue-500 p-6 rounded-lg">
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Important Note
              </h4>
              <p className="text-sm">
                This assessment tool is for screening purposes only and should not replace professional medical diagnosis.
                The scoring is based on the Katz hand diagram system and research showing the middle finger as the most 
                sensitive indicator for CTS. If you have concerns about your symptoms, please consult with a healthcare 
                provider for proper evaluation including nerve conduction studies if indicated.
              </p>
            </div>
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
          <p className="text-gray-600 mt-2 text-lg">
            Clinical assessment with validated scoring algorithms
          </p>
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