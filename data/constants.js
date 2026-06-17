export const CANVAS_WIDTH = 300;
export const CANVAS_HEIGHT = 400;

export const SOME_THRESHOLD = 5;
export const HALF_THRESHOLD = 50;

/**
 * Canonical string values used as participant answers throughout the app.
 *
 * If a new answer value is ever introduced, add it here first, then
 * reference it from both the UI and the scoring weights.
 */
export const ANSWERS = {
  YES: 'Yes',
  NO: 'No',
  NOT_RELEVANT: 'Not relevant',
};

export const STROKE_COLORS = {
  tingling: '#9333ea',
  numbness: '#3b82f6',
  pain: '#f97316'
};
export const OVERLAY_COLORS = {
    tingling: 'rgba(147, 51, 234, 0.4)',
    numbness: 'rgba(59, 130, 246, 0.4)',
    pain: 'rgba(249, 115, 22, 0.4)'
}

export const sections = [
  { id: 0, title: "Diagnostic Questions" },
  { id: 1, title: "Hand Diagrams" },
  { id: 2, title: "Results" },
];

export const KAMATH_COLORS = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    textDark: 'text-green-800'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    textDark: 'text-yellow-800'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    textDark: 'text-red-800'
  }
};

/**
 * Version identifier for the consent text. Bump this whenever the
 * wording in consentContent.js is materially revised, so REDCap
 * records carry accurate provenance of which version was shown.
 */
export const CONSENT_VERSION = 'v1-draft';

/**
 * Idle session timeout. After IDLE_TIMEOUT_MS of no input, a warning
 * modal appears with a IDLE_WARNING_MS countdown before the session
 * resets. Designed for kiosk deployment where participants may leave
 * the tab open between users.
 */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes
export const IDLE_WARNING_MS = 60 * 1000;        // 60 seconds