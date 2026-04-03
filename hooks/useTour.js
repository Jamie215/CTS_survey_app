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
 * Replaces the old CDN-based window.driver pattern with npm imports.
 *
 * @param {number} currentSection
 * @param {boolean} isClient
 * @param {boolean|null} hasNumbnessOrTingling
 * @returns {Object}
 */
export function useTour(currentSection, isClient, hasNumbnessOrTingling) {
  const [isTourActive, setIsTourActive] = useState(false);
  const driverRef = useRef(null);

  // Clear tour history on page refresh (session-only tours)
  useEffect(() => {
    if (!isClient) return;
    localStorage.removeItem('cts-survey-tour-completed-questions');
    localStorage.removeItem('cts-survey-tour-completed-handDiagram');
  }, [isClient]);

  // Trigger tours based on current section
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
  }, [currentSection, isClient]);

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
    const steps = getHandDiagramTourSteps(hasNumbnessOrTingling);

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
  }, [hasNumbnessOrTingling]);

  const handleHelpClick = useCallback(() => {
    if (currentSection === 1) {
      resetTour('handDiagram');
      handleStartHandDiagramTour();
    }
  }, [currentSection, handleStartHandDiagramTour]);

  return {
    isTourActive,
    handleHelpClick,
  };
}
