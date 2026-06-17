"use client"

import React, { useEffect, useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/constants';

/**
 * Shared canvas component for hand diagram drawing.
 *
 * Touch listeners are attached imperatively with { passive: false } so
 * that preventDefault() actually fires. React's synthetic touch
 * listeners on the document root are passive by default in modern
 * browsers (Chrome 56+, etc.), which means an inline
 * onTouchStart={(e) => e.preventDefault()} is silently ignored and
 * logs the "Unable to preventDefault inside passive event listener"
 * warning. The CSS touch-action: none on the canvas prevents some
 * gestures, but JS-level prevention has to be wired up directly.
 *
 * Mouse listeners stay on the JSX since they don't have this issue.
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
  // Stash the latest handlers in refs so the effect below can read the
  // current values without having to re-bind the listeners on every
  // render (which would also re-trigger the warning).
  const handlersRef = useRef({ onPointerDown, onPointerMove, onPointerUp });
  handlersRef.current = { onPointerDown, onPointerMove, onPointerUp };

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      handlersRef.current.onPointerDown(e, canvasKey);
    };
    const handleTouchMove = (e) => {
      e.preventDefault();
      handlersRef.current.onPointerMove(e, canvasKey);
    };
    const handleTouchEnd = (e) => {
      e.preventDefault();
      handlersRef.current.onPointerUp(e, canvasKey);
    };

    // passive: false is the whole point — without it, preventDefault()
    // is a no-op and the browser scrolls/zooms during drawing.
    const opts = { passive: false };
    canvas.addEventListener('touchstart', handleTouchStart, opts);
    canvas.addEventListener('touchmove', handleTouchMove, opts);
    canvas.addEventListener('touchend', handleTouchEnd, opts);
    canvas.addEventListener('touchcancel', handleTouchEnd, opts);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart, opts);
      canvas.removeEventListener('touchmove', handleTouchMove, opts);
      canvas.removeEventListener('touchend', handleTouchEnd, opts);
      canvas.removeEventListener('touchcancel', handleTouchEnd, opts);
    };
  }, [canvasRef, canvasKey]);

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