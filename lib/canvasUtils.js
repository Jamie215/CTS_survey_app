/**
 * Canvas drawing utilities for hand diagram rendering.
 *
 * Extracted from CTSSurvey to keep drawing logic separate from
 * component state and rendering concerns.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, STROKE_COLORS, OVERLAY_COLORS } from '../data/constants';

/**
 * Draw a hand outline image onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} isLeft
 * @param {boolean} isBack
 * @returns {Promise<void>}
 */
export function drawHandOutline(canvas, isLeft = false, isBack = false) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  let imagePath;
  if (isBack) {
    imagePath = isLeft ? '/hands/hand_back_left.png' : '/hands/hand_back_right.png';
  } else {
    imagePath = isLeft ? '/hands/hand_front_left.png' : '/hands/hand_front_right.png';
  }

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
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
      resolve();
    };
    img.src = imagePath;
  });
}

/**
 * Redraw saved stroke data onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} data - Array of point objects with type, x, y
 * @param {string} symptomType - 'pain' | 'tingling' | 'numbness'
 */
export function redrawStrokes(canvas, data, symptomType) {
  if (!canvas) return;
  paintStrokes(canvas.getContext('2d'), data, STROKE_COLORS[symptomType]);
}

/**
 * Draw combined symptom overlays (pain + tingling + numbness) onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {'Left'|'Right'} hand
 * @param {boolean} isBack
 * @param {Object} handDiagramData
 * @returns {Promise<void>}
 */
export function drawSymptomsOnCanvas(canvas, hand, isBack, handDiagramData) {
  if (!canvas) return Promise.resolve();

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const isLeft = hand === 'Left';
  return drawHandOutline(canvas, isLeft, isBack).then(() => {
    ['pain', 'tingling', 'numbness'].forEach((symptom) => {
      const dataKey = isBack ? `${symptom}Back${hand}` : `${symptom}Front${hand}`;
      paintStrokes(ctx, handDiagramData[dataKey] || [], OVERLAY_COLORS[symptom]);
    });
  });
}

/**
 * Extract canvas coordinates from a mouse or touch event.
 * @param {MouseEvent|TouchEvent} e
 * @param {HTMLCanvasElement} canvas
 * @returns {{ x: number, y: number }}
 */
export function getEventCoordinates(e, canvas) {
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
}

/**
 * Determine symptom type from a canvas key string.
 * @param {string} canvasKey
 * @returns {'pain'|'tingling'|'numbness'|'unknown'}
 */
export function getSymptomType(canvasKey) {
  if (canvasKey.startsWith('pain')) return 'pain';
  if (canvasKey.startsWith('tingling')) return 'tingling';
  if (canvasKey.startsWith('numbness')) return 'numbness';
  return 'unknown';
}

/**
 * Load and parse SVG region definitions from hand SVG files.
 * Returns an object with leftFront, rightFront, leftBack, rightBack regions.
 * @returns {Promise<Object>}
 */
export async function loadSVGRegions() {
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

  for (const { path, regions } of svgFiles) {
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

  return {
    leftFront: leftFrontRegions,
    rightFront: rightFrontRegions,
    leftBack: leftBackRegions,
    rightBack: rightBackRegions
  };
}

/**
 * Check whether any hand diagram canvas has at least one committed stroke.
 *
 * Used to warn the user before computing Katz scores from an entirely
 * blank diagram (which would silently yield a Katz score of 0 across
 * the board).
 *
 * @param {Object<string, Array>} handDiagramData
 * @returns {boolean}
 */
export function hasAnyDrawings(handDiagramData) {
  if (!handDiagramData) return false;
  return Object.values(handDiagramData).some(
    (strokes) => Array.isArray(strokes) && strokes.length > 0
  );
}

/**
 * Replay a stroke series onto a 2D canvas context. Single source of
 * truth for stroke replay — used by the on-screen drawing canvases,
 * the Results overlay, the export capture, and the offscreen
 * region-coverage canvases that drive Katz scoring.
 *
 * Line width / cap / join are fixed at the values the user's drawing
 * canvas uses, so a replay produces a pixel-equivalent rendering of
 * what the user actually drew — which matters for the Katz pipeline,
 * where coverage is measured by pixel overlap.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{type: string, x?: number, y?: number}>} data
 * @param {string} strokeStyle
 */
export function paintStrokes(ctx, data, strokeStyle) {
  if (!data || data.length === 0) return;

  ctx.strokeStyle = strokeStyle;
  ctx.fillStyle = strokeStyle;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  data.forEach((point) => {
    if (point.type === 'start') {
      // Explicit dot at stroke origin. Click-without-drag strokes
      // produce a zero-length subpath, which renders inconsistently
      // across browsers and silently zeroes out Katz coverage. For
      // multi-point strokes this dot is immediately overpainted by the
      // first segment (same colour, same diameter), so it's a visual
      // no-op there.
      ctx.beginPath();
      ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
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

/**
 * Render a single-symptom view (outline + that symptom's strokes) to
 * an offscreen canvas and return its PNG data URL. Used by the export
 * pipeline to serialise hand diagrams without raw stroke geometry.
 *
 * The opaque stroke colour from STROKE_COLORS is used (rather than the
 * translucent OVERLAY_COLORS), so each per-symptom image is fully
 * legible on its own.
 *
 * @param {'Left'|'Right'} hand
 * @param {boolean} isBack
 * @param {'pain'|'tingling'|'numbness'} symptom
 * @param {Object} handDiagramData
 * @returns {Promise<string>} PNG data URL
 */
export async function captureSymptomImage(hand, isBack, symptom, handDiagramData) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const isLeft = hand === 'Left';
  await drawHandOutline(canvas, isLeft, isBack);

  const dataKey = isBack ? `${symptom}Back${hand}` : `${symptom}Front${hand}`;
  const data = handDiagramData[dataKey] || [];
  if (data.length > 0) {
    paintStrokes(canvas.getContext('2d'), data, STROKE_COLORS[symptom]);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Capture all 12 per-symptom hand diagram views as PNG data URLs.
 * Keys mirror handDiagramData keys (e.g. "painFrontLeft") so a
 * downstream consumer can map images back to symptom/hand/view
 * without parsing the key.
 *
 * @param {Object} handDiagramData
 * @returns {Promise<Object<string, string>>}
 */
export async function captureHandDiagrams(handDiagramData) {
  const hands = ['Left', 'Right'];
  const views = [false, true]; // false = front/volar, true = back/dorsal
  const symptoms = ['pain', 'tingling', 'numbness'];

  const entries = await Promise.all(
    hands.flatMap((hand) =>
      views.flatMap((isBack) =>
        symptoms.map(async (symptom) => {
          const key = `${symptom}${isBack ? 'Back' : 'Front'}${hand}`;
          const dataUrl = await captureSymptomImage(hand, isBack, symptom, handDiagramData);
          return [key, dataUrl];
        }),
      ),
    ),
  );

  return Object.fromEntries(entries);
}