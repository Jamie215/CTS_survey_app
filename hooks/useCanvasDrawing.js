// hooks/useCanvasDrawing.js

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

export function useCanvasDrawing(currentSection) {
  const [handDiagramData, setHandDiagramData] = useState({});
  const [svgRegions, setSvgRegions] = useState({
    leftFront: {}, rightFront: {}, leftBack: {}, rightBack: {},
  });
  const [svgLoadError, setSvgLoadError] = useState(null);
  const [isClient, setIsClient] = useState(false);

  // Active-stroke refs
  const isDrawingRef = useRef(false);
  const currentCanvasKeyRef = useRef(null);
  const activeStrokeRef = useRef([]);

  // Lazy-init stable container of canvas refs. Doing this once means
  // identity is stable across renders, which is what lets us safely
  // list `canvasRefs` in useCallback/useEffect dep arrays without
  // retriggering.
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

  // Latest-ref pattern for handDiagramData. The section-change effect
  // below needs the *current* drawing state when it fires, but we
  // don't want it to refire every time a stroke is committed (which
  // would wipe and redraw the canvas mid-interaction).
  const handDiagramDataRef = useRef(handDiagramData);
  useEffect(() => {
    handDiagramDataRef.current = handDiagramData;
  }, [handDiagramData]);

  // Client-side init
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reusable SVG region loader — also exposed for the retry button.
  const retryLoadSVGRegions = useCallback(() => {
    setSvgLoadError(null);
    loadSVGRegions()
      .then((regions) => {
        setSvgRegions(regions);
        // Repaint any currently mounted canvases. Outlines are PNG-
        // based and unrelated to SVG regions, but if the user is on
        // section 1 when the load completes, this gives them a fresh
        // background to draw on.
        Object.entries(canvasRefs).forEach(([key, ref]) => {
          if (!ref.current) return;
          const isLeft = key.includes('Left');
          const isBack = key.includes('Back');
          drawHandOutline(ref.current, isLeft, isBack);
        });
      })
      .catch((error) => {
        console.error('Error loading SVG regions:', error);
        setSvgLoadError(error?.message || 'Failed to load hand diagram regions.');
      });
  }, [canvasRefs]);

  useEffect(() => {
    if (!isClient) return;
    retryLoadSVGRegions();
  }, [isClient, retryLoadSVGRegions]);

  // Reinit canvases when navigating to the hand diagram section. Draws
  // the outline first, then replays any existing strokes on top once
  // the outline image has actually painted (#11).
  useEffect(() => {
    if (!isClient) return;
    if (currentSection !== 1) return;

    let cancelled = false;

    Object.entries(canvasRefs).forEach(([key, ref]) => {
      if (!ref.current) return;
      const isLeft = key.includes('Left');
      const isBack = key.includes('Back');
      const existingData = handDiagramDataRef.current[key];

      drawHandOutline(ref.current, isLeft, isBack).then(() => {
        if (cancelled) return;
        if (existingData && existingData.length > 0) {
          redrawStrokes(ref.current, existingData, getSymptomType(key));
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentSection, isClient, canvasRefs]);

  // ─── Event handlers ──────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback((e, canvasKey) => {
    if (e.cancelable) e.preventDefault();

    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    currentCanvasKeyRef.current = canvasKey;
    activeStrokeRef.current = [];

    const { x, y } = getEventCoordinates(e, canvas);
    activeStrokeRef.current.push({ type: 'start', x, y });
    activeStrokeRef.current.push({ type: 'draw', x, y });

    const ctx = canvas.getContext('2d');
    const symptomType = getSymptomType(canvasKey);
    ctx.fillStyle = STROKE_COLORS[symptomType];
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [canvasRefs]);

  const handleCanvasPointerMove = useCallback((e, canvasKey) => {
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    if (e.cancelable) e.preventDefault();

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
  }, [canvasRefs]);

  const handleCanvasPointerUp = useCallback((e, canvasKey) => {
    if (!isDrawingRef.current || currentCanvasKeyRef.current !== canvasKey) return;
    if (e.cancelable) e.preventDefault();

    activeStrokeRef.current.push({ type: 'end' });

    const committedPoints = [...activeStrokeRef.current];
    setHandDiagramData((prev) => ({
      ...prev,
      [canvasKey]: [...(prev[canvasKey] || []), ...committedPoints],
    }));

    isDrawingRef.current = false;
    currentCanvasKeyRef.current = null;
    activeStrokeRef.current = [];
  }, []);

  const handleClearCanvas = useCallback((canvasKey) => {
    const ref = canvasRefs[canvasKey];
    const canvas = ref?.current;
    if (!canvas) return;
    const isLeft = canvasKey.includes('Left');
    const isBack = canvasKey.includes('Back');
    drawHandOutline(canvas, isLeft, isBack);
    setHandDiagramData((prev) => ({ ...prev, [canvasKey]: [] }));
  }, [canvasRefs]);

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