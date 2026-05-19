"use client"

import React from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/constants';

/**
 * Shared canvas component for hand diagram drawing.
 * Eliminates the repeated canvas + clear button pattern.
 *
 * Canvas display size is responsive: fills available width up to
 * maxWidth, with height maintained via aspect-ratio. The internal canvas
 * resolution (CANVAS_WIDTH x CANVAS_HEIGHT) remains fixed, and
 * getEventCoordinates() uses getBoundingClientRect() so coordinate
 * scaling is handled automatically regardless of display size.
 *
 * @param {Object} props
 * @param {string} props.id - HTML id for tour targeting
 * @param {string} props.canvasKey - Key in handDiagramData
 * @param {string} props.label - e.g. "Left Hand" or "Right Hand"
 * @param {React.RefObject} props.canvasRef
 * @param {Function} props.onPointerDown
 * @param {Function} props.onPointerMove
 * @param {Function} props.onPointerUp
 * @param {Function} props.onClear
 * @param {string} [props.maxWidth] - Maximum CSS display width (default '200px')
 */
export default function HandDiagramCanvas({
  id,
  canvasKey,
  label,
  canvasRef,
  ariaLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClear,
  maxWidth = '200px',
}) {
  return (
    <div className="text-center w-full sm:w-auto">
      <p className="mb-2 text-lg font-medium text-gray-700">{label}</p>
      <canvas
        id={id}
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
        style={{
          width: '100%',
          maxWidth,
          height: 'auto',
          aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
        }}
        aria-label={ariaLabel}
        onMouseDown={(e) => onPointerDown(e, canvasKey)}
        onMouseMove={(e) => onPointerMove(e, canvasKey)}
        onMouseUp={(e) => onPointerUp(e, canvasKey)}
        onMouseLeave={(e) => onPointerUp(e, canvasKey)}
        onTouchStart={(e) => { e.preventDefault(); onPointerDown(e, canvasKey); }}
        onTouchMove={(e) => { e.preventDefault(); onPointerMove(e, canvasKey); }}
        onTouchEnd={(e) => { e.preventDefault(); onPointerUp(e, canvasKey); }}
      />
      <button
        id={`clear-btn-${canvasKey}`}
        onClick={() => onClear(canvasKey)}
        className="mt-2 px-6 py-3 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
      >
        Clear
      </button>
    </div>
  );
}