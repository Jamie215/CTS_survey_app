/**
 * Tour Configuration for CTS Survey App
 * Uses driver.js (npm) for guided user onboarding
 */

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// Configuration for Section 0: Diagnostic Questions (highlight only, no popover)
export const questionsHighlightConfig = {
  element: '#diagnostic-header',
};

/**
 * Generate tour steps for the Hand Diagrams section.
 * Steps vary based on whether the user reported numbness/tingling.
 * @param {boolean|null} hasNumbnessOrTingling
 * @returns {Array}
 */
export const getHandDiagramTourSteps = (hasNumbnessOrTingling) => {
  const symptomDescription = hasNumbnessOrTingling === false
    ? 'Mark the areas where you experience <strong style="color: #f97316;">pain (orange)</strong>.'
    : 'Each symptom type has its own section with a unique color: <strong style="color: #f97316;">pain (orange)</strong>, <strong style="color: #9333ea;">tingling (purple)</strong>, and <strong style="color: #3b82f6;">numbness (blue)</strong>.';

  return [
    {
      element: '#hand-diagram-header',
      popover: {
        title: 'Hand Diagram Overview',
        description: symptomDescription,
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#canvas-painFrontLeft',
      popover: {
        title: 'Draw Your Symptoms',
        description: 'Click or tap and drag on the hand diagram to shade the areas where you feel this symptom. Lift your mouse or finger to finish drawing.',
        side: 'right',
        align: 'start'
      }
    },
    {
      element: '#back-view-section-pain',
      popover: {
        title: 'Back of Hand',
        description: 'Don\'t forget to mark the back of your hand if you experience symptoms there too.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '#clear-btn-painFrontLeft',
      popover: {
        title: 'Clear & Redraw',
        description: 'Made a mistake? Use the &quot;Clear&quot; button to erase and start over for that hand.',
        side: 'top',
        align: 'center'
      }
    }
  ];
};

// Driver.js configuration for sequential hand diagram tour
export const handDiagramTourConfig = {
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  doneBtnText: 'Got it!',
  progressText: '{{current}} of {{total}}',
  popoverClass: 'cts-tour-popover',
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  stagePadding: 10,
  stageRadius: 8,
  allowClose: true,
  overlayClickNext: false,
  keyboardControl: true,
  disableActiveInteraction: true
};

// Configuration for highlight-only mode (questions section)
export const highlightConfig = {
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  stagePadding: 10,
  stageRadius: 8,
  animate: true,
  onHighlightStarted: () => {},
  onHighlighted: () => {},
  onDeselected: () => {}
};

// Local storage key for tracking if user has seen the tour
export const TOUR_STORAGE_KEY = 'cts-survey-tour-completed';

/** Check if tour has been completed for a section */
export const hasTourBeenCompleted = (section) => {
  if (typeof window === 'undefined') return true;
  const completed = localStorage.getItem(`${TOUR_STORAGE_KEY}-${section}`);
  return completed === 'true';
};

/** Mark tour as completed for a section */
export const markTourCompleted = (section) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${TOUR_STORAGE_KEY}-${section}`, 'true');
};

/** Reset tour for a section (for "Help" button) */
export const resetTour = (section) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-${section}`);
};

/** Reset all tours */
export const resetAllTours = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-questions`);
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-handDiagram`);
};

/**
 * Create a new driver instance with the given config.
 * This replaces the old CDN-based `window.driver.js.driver()` pattern.
 * @param {Object} config
 * @returns {Object} driver instance
 */
export const createDriver = (config) => {
  return driver(config);
};
