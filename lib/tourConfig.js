/**
 * Tour Configuration for CTS Survey App
 * Uses driver.js for guided user onboarding
 * 
 */

// Configuration for Section 0: Diagnostic Questions (highlight only, no popover)
export const questionsHighlightConfig = {
  element: '#diagnostic-header',
  // No popover - just highlights the element
};

// Tour steps for Section 1: Hand Diagrams
export const handDiagramTourSteps = [
  {
    element: '#symptom-section-pain',
    popover: {
      title: 'Symptom Sections',
      description: 'Each symptom type has its own section with a unique color: <strong style="color: #9333ea;">tingling (purple)</strong>, <strong style="color: #3b82f6;">numbness (blue)</strong>, and <strong style="color: #f97316;">pain (orange)</strong>.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#canvas-painFrontLeft',
    popover: {
      title: 'Draw Your Symptoms',
      description: 'Click and drag on the hand diagram to shade the areas where you feel this symptom. Draw as accurately as you can.',
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
      description: 'Made a mistake? Use the Clear button to erase and start over for that hand.',
      side: 'top',
      align: 'center'
    }
  }
];

// Driver.js configuration options for hand diagram tour
export const driverConfig = {
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  steps: [],
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  doneBtnText: 'Done',
  progressText: '{{current}} of {{total}}',
  popoverClass: 'cts-tour-popover',
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  stagePadding: 10,
  stageRadius: 8,
  allowClose: true,
  overlayClickNext: false,
  keyboardControl: true
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

// Custom CSS for the tour (add to your global CSS or styled-components)
export const tourStyles = `
  .cts-tour-popover {
    font-family: inherit;
  }
  
  .cts-tour-popover .driver-popover-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  .cts-tour-popover .driver-popover-description {
    font-size: 1rem;
    color: #4b5563;
    line-height: 1.5;
  }
  
  .cts-tour-popover .driver-popover-progress-text {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .cts-tour-popover .driver-popover-next-btn,
  .cts-tour-popover .driver-popover-prev-btn {
    font-size: 0.938rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
  }
  
  .cts-tour-popover .driver-popover-next-btn {
    background-color: #9333ea;
    color: white;
  }
  
  .cts-tour-popover .driver-popover-next-btn:hover {
    background-color: #7e22ce;
  }
`;

// Local storage key for tracking if user has seen the tour
export const TOUR_STORAGE_KEY = 'cts-survey-tour-completed';

// Helper to check if tour has been completed
export const hasTourBeenCompleted = (section) => {
  if (typeof window === 'undefined') return true;
  const completed = localStorage.getItem(`${TOUR_STORAGE_KEY}-${section}`);
  return completed === 'true';
};

// Helper to mark tour as completed
export const markTourCompleted = (section) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${TOUR_STORAGE_KEY}-${section}`, 'true');
};

// Helper to reset tour (for "Help" button)
export const resetTour = (section) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-${section}`);
};

// Reset all tours
export const resetAllTours = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-questions`);
  localStorage.removeItem(`${TOUR_STORAGE_KEY}-handDiagram`);
};