export const CANVAS_WIDTH = 300;
export const CANVAS_HEIGHT = 400;

export const MIN_THRESHOLD = 5;
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
 * Canonical Katz region list, ordered for display in the Results UI
 * and as the contract for per-region REDCap field naming.
 *
 * `key` matches the SVG inkscape:label values in /public/hands/*.svg,
 * which are also the keys populated in
 * coverageBySymptom[symptom][region] by analyzeSymptomDistribution.
 *
 * UI display is driven by this list. The CSV export iterates
 * coverageBySymptom directly, so a region appearing in the SVGs but
 * missing from this list is still captured in the data — UI omission
 * never silently drops research data.
 */
export const KATZ_REGIONS = [
  { key: 'thumb_distal',    group: 'Thumb',        label: 'Distal' },
  { key: 'thumb_proximal',  group: 'Thumb',        label: 'Proximal' },
  { key: 'index_distal',    group: 'Index',        label: 'Distal' },
  { key: 'index_middle',    group: 'Index',        label: 'Middle' },
  { key: 'index_proximal',  group: 'Index',        label: 'Proximal' },
  { key: 'middle_distal',   group: 'Middle',       label: 'Distal' },
  { key: 'middle_middle',   group: 'Middle',       label: 'Middle' },
  { key: 'middle_proximal', group: 'Middle',       label: 'Proximal' },
  { key: 'palm_radial',     group: 'Palm',         label: 'Radial' },
  { key: 'palm_ulnar',      group: 'Palm',         label: 'Ulnar' },
  { key: 'wrist',           group: 'Wrist',        label: '' },
  { key: 'dorsum',          group: 'Back of hand', label: '' },
];

export const KATZ_SYMPTOMS = ['pain', 'tingling', 'numbness'];

/**
 * Idle session timeout. After IDLE_TIMEOUT_MS of no input, a warning
 * modal appears with a IDLE_WARNING_MS countdown before the session
 * resets. Designed for kiosk deployment where participants may leave
 * the tab open between users.
 */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes
export const IDLE_WARNING_MS = 60 * 1000;        // 60 seconds