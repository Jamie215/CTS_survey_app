import { describe, it, expect } from 'vitest';
import { deriveSymptomFlags, analyzeSymptomDistribution } from '../lib/katzScoring';
import { MIN_THRESHOLD, HALF_THRESHOLD } from '../data/constants';

/**
 * Unit tests for deriveSymptomFlags — the pure threshold/flag logic
 * extracted from analyzeSymptomDistribution.
 *
 * The pixel-counting upstream of this (calculateRegionCoverage and
 * calculateCombinedRegionCoverage) requires a real canvas and is
 * covered by manual verification rather than unit tests.
 *
 * MIN_THRESHOLD, HALF_THRESHOLD — these tests assume
 * those values; if they're tuned, the threshold-boundary tests
 * below will need to follow.
 */

function emptyCoverage() {
  return {
    thumb_distal: 0, thumb_proximal: 0,
    index_distal: 0, index_middle: 0, index_proximal: 0,
    middle_distal: 0, middle_middle: 0, middle_proximal: 0,
    palm_radial: 0, palm_ulnar: 0,
    dorsum: 0,
    wrist: 0,
  };
}

describe('deriveSymptomFlags — digit rules', () => {
  it('thumb: affected only when thumb_distal strictly exceeds MIN_THRESHOLD', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), thumb_distal: MIN_THRESHOLD + 0.1 }).thumbAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), thumb_distal: MIN_THRESHOLD }).thumbAffected).toBe(false);
    expect(deriveSymptomFlags(emptyCoverage()).thumbAffected).toBe(false);
  });

  it('index: affected if index_middle >= HALF_THRESHOLD OR index_distal > MIN_THRESHOLD', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), index_middle: HALF_THRESHOLD }).indexAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), index_middle: HALF_THRESHOLD - 0.1 }).indexAffected).toBe(false);
    expect(deriveSymptomFlags({ ...emptyCoverage(), index_distal: MIN_THRESHOLD + 0.1 }).indexAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), index_distal: MIN_THRESHOLD }).indexAffected).toBe(false);
  });

  it('index proximal coverage on its own does NOT trigger affected', () => {
    // Pinning this so a refactor doesn't accidentally widen the rule.
    expect(deriveSymptomFlags({ ...emptyCoverage(), index_proximal: 100 }).indexAffected).toBe(false);
  });

  it('middle: mirrors index rule on middle_* regions', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), middle_middle: HALF_THRESHOLD }).middleAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), middle_distal: MIN_THRESHOLD + 0.1 }).middleAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), middle_middle: HALF_THRESHOLD - 1, middle_distal: MIN_THRESHOLD }).middleAffected).toBe(false);
  });

  it('medianDigitsAffected counts thumb + index + middle independently', () => {
    expect(deriveSymptomFlags(emptyCoverage()).medianDigitsAffected).toBe(0);
    expect(deriveSymptomFlags({ ...emptyCoverage(), thumb_distal: 100 }).medianDigitsAffected).toBe(1);
    expect(deriveSymptomFlags({ ...emptyCoverage(), thumb_distal: 100, index_distal: 100 }).medianDigitsAffected).toBe(2);
    expect(deriveSymptomFlags({
      ...emptyCoverage(),
      thumb_distal: 100, index_distal: 100, middle_distal: 100,
    }).medianDigitsAffected).toBe(3);
  });
});

describe('deriveSymptomFlags — palm logic', () => {
  it('radial/ulnar each use MIN_THRESHOLD strictly', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: MIN_THRESHOLD + 0.1 }).palmAffected.radial).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: MIN_THRESHOLD }).palmAffected.radial).toBe(false);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_ulnar: MIN_THRESHOLD + 0.1 }).palmAffected.ulnar).toBe(true);
  });

  it('any: true if either radial or ulnar is affected', () => {
    expect(deriveSymptomFlags(emptyCoverage()).palmAffected.any).toBe(false);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: 30 }).palmAffected.any).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_ulnar: 30 }).palmAffected.any).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: 30, palm_ulnar: 30 }).palmAffected.any).toBe(true);
  });

  it('confinedToUlnar: ulnar affected AND radial not affected', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_ulnar: 30 }).palmAffected.confinedToUlnar).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: 30, palm_ulnar: 30 }).palmAffected.confinedToUlnar).toBe(false);
    expect(deriveSymptomFlags({ ...emptyCoverage(), palm_radial: 30 }).palmAffected.confinedToUlnar).toBe(false);
    expect(deriveSymptomFlags(emptyCoverage()).palmAffected.confinedToUlnar).toBe(false);
  });
});

describe('deriveSymptomFlags — dorsum and wrist', () => {
  it('dorsum: MIN_THRESHOLD strict', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), dorsum: MIN_THRESHOLD + 0.1 }).dorsumAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), dorsum: MIN_THRESHOLD }).dorsumAffected).toBe(false);
  });

  it('wrist: MIN_THRESHOLD strict', () => {
    expect(deriveSymptomFlags({ ...emptyCoverage(), wrist: MIN_THRESHOLD + 0.1 }).wristAffected).toBe(true);
    expect(deriveSymptomFlags({ ...emptyCoverage(), wrist: MIN_THRESHOLD }).wristAffected).toBe(false);
  });
});

describe('deriveSymptomFlags — sparse and missing input', () => {
  it('treats undefined region values as 0 coverage', () => {
    const flags = deriveSymptomFlags({ thumb_distal: 30 });
    expect(flags.thumbAffected).toBe(true);
    expect(flags.indexAffected).toBe(false);
    expect(flags.middleAffected).toBe(false);
    expect(flags.palmAffected.any).toBe(false);
    expect(flags.dorsumAffected).toBe(false);
    expect(flags.wristAffected).toBe(false);
  });

  it('empty object yields all-zero flags rather than throwing', () => {
    const flags = deriveSymptomFlags({});
    expect(flags.medianDigitsAffected).toBe(0);
    expect(flags.palmAffected.any).toBe(false);
    expect(flags.palmAffected.confinedToUlnar).toBe(false);
    expect(flags.dorsumAffected).toBe(false);
    expect(flags.wristAffected).toBe(false);
  });
});

describe('deriveSymptomFlags — clinical scenarios', () => {
  // Inputs shaped to land on each Katz band. calculateKatzScore is
  // tested separately; here we just confirm the flag shapes that
  // calculateKatzScore consumes.

  it('Classic pattern: 2+ digits, no palm, no dorsum', () => {
    const flags = deriveSymptomFlags({
      ...emptyCoverage(),
      thumb_distal: 40,
      index_distal: 40,
    });
    expect(flags.medianDigitsAffected).toBe(2);
    expect(flags.palmAffected.any).toBe(false);
    expect(flags.dorsumAffected).toBe(false);
  });

  it('Probable pattern: 2+ digits with radial palm involvement', () => {
    const flags = deriveSymptomFlags({
      ...emptyCoverage(),
      thumb_distal: 40,
      index_distal: 40,
      palm_radial: 30,
    });
    expect(flags.medianDigitsAffected).toBeGreaterThanOrEqual(2);
    expect(flags.palmAffected.any).toBe(true);
    expect(flags.palmAffected.confinedToUlnar).toBe(false);
    expect(flags.dorsumAffected).toBe(false);
  });

  it('Ulnar-confined palm with 2 digits: digits + palm.any + confinedToUlnar', () => {
    // Would route to Possible (1) in calculateKatzScore.
    const flags = deriveSymptomFlags({
      ...emptyCoverage(),
      thumb_distal: 40,
      index_distal: 40,
      palm_ulnar: 30,
    });
    expect(flags.medianDigitsAffected).toBe(2);
    expect(flags.palmAffected.any).toBe(true);
    expect(flags.palmAffected.confinedToUlnar).toBe(true);
  });

  it('Dorsum involvement is preserved regardless of digit count', () => {
    // calculateKatzScore caps the score at Possible when dorsum is
    // involved; the flag itself just needs to be true.
    const flags = deriveSymptomFlags({
      ...emptyCoverage(),
      thumb_distal: 40,
      index_distal: 40,
      middle_distal: 40,
      dorsum: 30,
    });
    expect(flags.medianDigitsAffected).toBe(3);
    expect(flags.dorsumAffected).toBe(true);
  });
});

describe('analyzeSymptomDistribution — empty-region fallback', () => {
  // This path runs before any canvas work, so it's safe to test
  // without jsdom canvas support.

  it('returns zeroed defaults when svgRegions is entirely empty', () => {
    const result = analyzeSymptomDistribution('Left', {}, {});
    expect(result.medianDigitsAffected).toBe(0);
    expect(result.palmAffected.any).toBe(false);
    expect(result.dorsumAffected).toBe(false);
    expect(result.coverageBySymptom).toEqual({});
    expect(result.detailedCoverage).toEqual({});
  });

  it('returns defaults when the hand-specific region map is empty', () => {
    const svgRegions = { leftFront: {}, leftBack: {}, rightFront: {}, rightBack: {} };
    const result = analyzeSymptomDistribution('Left', svgRegions, {});
    expect(result.medianDigitsAffected).toBe(0);
  });
});