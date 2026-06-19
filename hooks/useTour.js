"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  questionsHighlightConfig,
  getHandDiagramTourSteps,
  handDiagramTourConfig,
  highlightConfig,
  hasTourBeenCompleted,
  markTourCompleted,
  resetTour,
  createDriver,
} from '../lib/tourConfig';

/**
 * Custom hook for managing driver.js guided tours.
 *
 * @param {number} currentSection
 * @param {boolean} isClient
 * @param {boolean|null} hasNumbnessOrTingling
 * @returns {Object}
 */
export function useTour(currentSection, isClient, hasNumbnessOrTingling) {
  const [isTourActive, setIsTourActive] = useState(false);
  const driverRef = useRef(null);

  // Latest-ref for hasNumbnessOrTingling so handleStartHandDiagramTour
  // keeps a stable identity across renders. Without this, answering Q1
  // would flip the handler's identity, re-run the section-trigger
  // effect below, and the effect's cleanup would tear down the active
  // questions highlight under the user. Matches the pattern used in
  // useIdleTimeout (showWarningRef) and useCanvasDrawing
  // (handDiagramDataRef).
  const hasNumbnessOrTinglingRef = useRef(hasNumbnessOrTingling);
  useEffect(() => {
    hasNumbnessOrTinglingRef.current = hasNumbnessOrTingling;
  }, [hasNumbnessOrTingling]);

  // Clear tour history on page refresh (session-only tours)
  useEffect(() => {
    if (!isClient) return;
    localStorage.removeItem('cts-survey-tour-completed-questions');
    localStorage.removeItem('cts-survey-tour-completed-handDiagram');
  }, [isClient]);

  // ── Tour handlers ─────────────────────────────────────────────────
  // Declared before the section-trigger effect that calls them so the
  // control flow reads top-to-bottom. Both handlers have empty
  // dependency arrays — their identities are stable for the lifetime
  // of the hook, which is what keeps the section-trigger effect from
  // re-running on every parent render.

  const handleStartHighlight = useCallback(() => {
    const element = document.querySelector(questionsHighlightConfig.element);
    if (!element) {
      console.warn('Highlight element not found:', questionsHighlightConfig.element);
      return;
    }

    driverRef.current = createDriver({
      ...highlightConfig,
      onDeselected: () => {
        markTourCompleted('questions');
      }
    });

    driverRef.current.highlight({
      element: questionsHighlightConfig.element,
      popover: null
    });
  }, []);

  const handleStartHandDiagramTour = useCallback(() => {
    const steps = getHandDiagramTourSteps(hasNumbnessOrTinglingRef.current);

    const allElementsExist = steps.every(step => {
      const exists = document.querySelector(step.element);
      if (!exists) {
        console.warn(`Element not found: ${step.element}`);
      }
      return exists;
    });

    if (!allElementsExist) {
      console.warn('Some tour elements not found, skipping tour');
      return;
    }

    setIsTourActive(true);

    driverRef.current = createDriver({
      ...handDiagramTourConfig,
      steps: steps,
      onDestroyStarted: () => {
        markTourCompleted('handDiagram');
        setIsTourActive(false);
        if (driverRef.current) {
          driverRef.current.destroy();
        }

        const headerElement = document.querySelector('#hand-diagram-header');
        if (headerElement) {
          headerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    driverRef.current.drive();
  }, []);

  const handleHelpClick = useCallback(() => {
    if (currentSection === 1) {
      resetTour('handDiagram');
      handleStartHandDiagramTour();
    }
  }, [currentSection, handleStartHandDiagramTour]);

  // Trigger tours based on current section. Effective deps reduce to
  // [currentSection, isClient] because both handlers are stable; the
  // exhaustive-deps rule still wants them listed.
  useEffect(() => {
    if (!isClient) return;

    const timer = setTimeout(() => {
      if (currentSection === 0 && !hasTourBeenCompleted('questions')) {
        handleStartHighlight();
      } else if (currentSection === 1 && !hasTourBeenCompleted('handDiagram')) {
        handleStartHandDiagramTour();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [currentSection, isClient, handleStartHighlight, handleStartHandDiagramTour]);

  return {
    isTourActive,
    handleHelpClick,
  };
}