"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import { STROKE_COLORS } from '../data/constants';
import {
  drawHandOutline,
  redrawStrokes,
  getEventCoordinates,
  getSymptomType,
  loadSVGRegions,
} from '../lib/canvasUtils';

export function useCanvasDrawing(isTourActive, currentSection) {
  const [handDiagramData, setHandDiagramData] = useState({});
  const [svgRegions, setSvgRegions] = useState({
    leftFront: {},
    rightFront: {},
    leftBack: {},
    rightBack: {}
  });
  const [svgLoadError, setSvgLoadError] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Active-stroke refs
  const isDrawingRef = useRef(false);
  const currentCanvasKeyRef = useRef(null);
  const activeStrokeRef = useRef([]);

  const canvasRefsContainer = useRef(null);
  if (canvasRefsContainer.current === null) {
    canvasRefsContainer.current = {
        painFrontLeft:     { current: null },
        painFrontRight:    { current: null },
        painBackLeft:      { current: null },
        painBackRight:     { current: null },
        tinglingFrontLeft: { current: null },
        tinglingFrontRight:{ current: null },
        tinglingBackLeft:  { current: null },
        tinglingBackRight: { current: null },
        numbnessFrontLeft: { current: null },
        numbnessFrontRight:{ current: null },
        numbnessBackLeft:  { current: null },
        numbnessBackRight: { current: null },
    };
  }
  // Canvas refs
  const canvasRefs = canvasRefsContainer.current;

  const resultsCanvasRefsContainer = useRef(null);
  if (resultsCanvasRefsContainer.current === null) {
    resultsCanvasRefsContainer.current = {
      combinedLeftVolar:   { current: null },
      combinedRightVolar:  { current: null },
      combinedLeftDorsal:  { current: null },
      combinedRightDorsal: { current: null },
    };
  }
  const resultsCanvasRefs = resultsCanvasRefsContainer.current;

  // Client-side init
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reusable loader — exposed for the retry button as well
  const retryLoadSVGRegions = useCallback(() => {
    setSvgLoadError(null);
    loadSVGRegions()
      .then(regions => {
        setSvgRegions(regions);
        setTimeout(() => {
          Object.entries(canvasRefs).forEach(([key, ref]) => {
            if (ref.current) {
              const isLeft = key.includes('Left');
              const isBack = key.includes('Back');
              drawHandOutline(ref.current, isLeft, isBack);
            }
          });
        }, 100);
      })
      .catch(error => {
        console.error('Error loading SVG regions:', error);
        setSvgLoadError(error?.message || 'Failed to load hand diagram regions.');
      });
  }, [canvasRefs]);

  useEffect(() => {
    if (!isClient) return;
    retryLoadSVGRegions();
  }, [isClient, retryLoadSVGRegions]);

  // Init canvases on mount
  useEffect(() => {
    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (ref.current) {
        const isLeft = key.includes('Left');
        const isBack = key.includes('Back');
        drawHandOutline(ref.current, isLeft, isBack);
      }
    });
  }, [isClient]);

  // Reinit canvases when navigating to hand diagram section
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

  // --- Event handlers (item #6: consistent handleX naming) ---

  const handleCanvasPointerDown = useCallback((e, canvasKey) => {
    if (isTourActive) return;
    e.preventDefault();

    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    currentCanvasKeyRef.current = canvasKey;
    activeStrokeRef.current = [];

    const { x, y } = getEventCoordinates(e, canvas);
    activeStrokeRef.current.push({ type: 'start', x, y });

    const ctx = canvas.getContext('2d');
    const symptomType = getSymptomType(canvasKey);
    ctx.fillStyle = STROKE_COLORS[symptomType];
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [isTourActive]);

  const handleCanvasPointerMove = useCallback((e, canvasKey) => {
    if (isTourActive) return;
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    e.preventDefault();

    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;

    const { x, y } = getEventCoordinates(e, canvas);
    const points = activeStrokeRef.current;
    const lastPoint = points[points.length - 1];

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

    activeStrokeRef.current.push({ type: 'draw', x, y });
  }, [isTourActive]);

  const handleCanvasPointerUp = useCallback((e, canvasKey) => {
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    e.preventDefault();

    activeStrokeRef.current.push({ type: 'end' });

    // Commit accumulated stroke to state only on pointer up (#5)
    const committedPoints = [...activeStrokeRef.current];
    setHandDiagramData(prev => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), ...committedPoints]
    }));

    isDrawingRef.current = false;
    currentCanvasKeyRef.current = null;
    activeStrokeRef.current = [];
  }, []);

  const handleClearCanvas = useCallback((canvasKey) => {
    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (canvas) {
      const isLeft = canvasKey.includes('Left');
      const isBack = canvasKey.includes('Back');
      drawHandOutline(canvas, isLeft, isBack);
      setHandDiagramData(prev => ({ ...prev, [canvasKey]: [] }));
    }
  }, []);

  return {
    isClient,
    handDiagramData,
    svgRegions,
    svgLoadError,
    retryLoadSVGRegions,
    canvasRefs,
    resultsCanvasRefs,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleClearCanvas,
  };
}
