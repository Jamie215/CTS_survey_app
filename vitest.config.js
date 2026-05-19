import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the CTS Survey App.
 *
 * Scope: the pure scoring functions in lib/ (kamathScoring, katzScoring).
 * These have no React or DOM dependency, so the lightweight `node`
 * environment is used — fast, no jsdom needed.
 *
 * NOT covered here: the canvas-pixel functions in katzScoring.js
 * (calculateRegionCoverage, calculateCombinedRegionCoverage,
 * analyzeSymptomDistribution) depend on a real <canvas> 2d context and
 * are out of scope for unit tests — they are verified via the manual
 * scoring-verification pass instead.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: false,
  },
});