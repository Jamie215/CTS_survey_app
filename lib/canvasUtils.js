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
}

/**
 * Redraw saved stroke data onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} data - Array of point objects with type, x, y
 * @param {string} symptomType - 'pain' | 'tingling' | 'numbness'
 */
export function redrawStrokes(canvas, data, symptomType) {
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = STROKE_COLORS[symptomType];
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
}

/**
 * Draw combined symptom overlays (pain + tingling + numbness) onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {'Left'|'Right'} hand
 * @param {boolean} isBack
 * @param {Object} handDiagramData
 */
export function drawSymptomsOnCanvas(canvas, hand, isBack, handDiagramData) {
  if (!canvas) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const isLeft = hand === 'Left';
  drawHandOutline(canvas, isLeft, isBack);

  setTimeout(() => {
    ['pain', 'tingling', 'numbness'].forEach((symptom) => {
      const dataKey = isBack ? `${symptom}Back${hand}` : `${symptom}Front${hand}`;
      const data = handDiagramData[dataKey] || [];

      ctx.strokeStyle = OVERLAY_COLORS[symptom];
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
