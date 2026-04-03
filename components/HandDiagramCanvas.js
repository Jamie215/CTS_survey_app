"use client"

import React from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/constants';

/**
 * Shared canvas component for hand diagram drawing.
 * Eliminates the repeated canvas + clear button pattern.
 *
 * Inline styles replaced with Tailwind classes where possible (item #8).
 * Canvas display dimensions still need explicit style since Tailwind
 * doesn't have built-in support for canvas width/height attributes.
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
 * @param {{ width: string, height: string }} [props.displaySize] - CSS display dimensions
 */
export default function HandDiagramCanvas({
  id,
  canvasKey,
  label,
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClear,
  displaySize = { width: '200px', height: '267px' },
}) {
  return (
    <div className="text-center">
      <p className="mb-2 text-lg font-medium text-gray-700">{label}</p>
      <canvas
        id={id}
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300 rounded-lg cursor-crosshair bg-white touch-none"
        style={displaySize}
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
        className="mt-2 px-4 py-2 text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
