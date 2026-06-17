"use client"

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Idle-timeout state machine for clinical deployments.
 *
 * Two phases:
 *   1. Active. Any user input resets the idle timer.
 *   2. Warning. Once idleMs of no input elapses, `showWarning` flips
 *      to true and `secondsRemaining` counts down. Activity during
 *      the warning phase is intentionally ignored — only the explicit
 *      dismiss button rolls back to the active phase. A stray mouse
 *      jiggle on a shared kiosk shouldn't defeat the protection.
 *
 * When the countdown reaches zero, `onTimeout` fires (callers reload
 * the page; same recovery path the ErrorBoundary uses).
 *
 * Activity events: mousedown / keydown / touchstart / pointerdown.
 * Pointer movement is deliberately excluded — moving the cursor past
 * the screen isn't engagement with the survey.
 */
export function useIdleTimeout({ idleMs, warningMs, onTimeout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.ceil(warningMs / 1000)
  );

  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  // Latest-ref so the activity listener can read showWarning without
  // having to re-bind every time it changes.
  const showWarningRef = useRef(showWarning);
  useEffect(() => { showWarningRef.current = showWarning; }, [showWarning]);

  const clearAll = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const startIdleTimer = useCallback(() => {
    clearAll();
    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(Math.ceil(warningMs / 1000));

      const startedAt = Date.now();
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.ceil((warningMs - elapsed) / 1000));
        setSecondsRemaining(remaining);
      }, 250);

      warningTimerRef.current = setTimeout(() => {
        clearAll();
        onTimeout?.();
      }, warningMs);
    }, idleMs);
  }, [idleMs, warningMs, onTimeout, clearAll]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
    const handleActivity = () => {
      if (!showWarningRef.current) {
        startIdleTimer();
      }
    };
    events.forEach((e) =>
      window.addEventListener(e, handleActivity, { passive: true })
    );
    startIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearAll();
    };
  }, [startIdleTimer, clearAll]);

  return { showWarning, secondsRemaining, dismissWarning };
}