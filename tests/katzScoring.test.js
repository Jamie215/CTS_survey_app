import { describe, it, expect } from 'vitest';
import { calculateKatzScore } from '../lib/katzScoring';

/**
 * Unit tests for calculateKatzScore.
 *
 * calculateKatzScore is pure: it reads only medianDigitsAffected,
 * palmAffected.{any,confinedToUlnar}, and dorsumAffected from the
 * SymptomDistribution object. So a distribution can be hand-built
 * directly — no canvas needed.
 *
 * The canvas-pixel pipeline that PRODUCES a real distribution
 * (analyzeSymptomDistribution and the coverage functions) is checked by the manual verification pass instead.
 *
 * `dist()` builds a minimal valid SymptomDistribution; each test
 * overrides only the fields its band depends on.
 */
function dist(overrides = {}) {
  return {
    medianDigitsAffected: 0,
    palmAffected: {
      radial: false,
      ulnar: false,
      any: false,
      confinedToUlnar: false,
    },
    dorsumAffected: false,
    ...overrides,
  };
}

describe('calculateKatzScore — Unlikely (0)', () => {
  it('returns score 0 when no median digits are affected', () => {
    const r = calculateKatzScore(dist({ medianDigitsAffected: 0 }));
    expect(r.score).toBe(0);
    expect(r.classification).toBe('Unlikely CTS');
  });

  it('returns Unlikely even if palm/dorsum are involved but 0 digits', () => {
    const r = calculateKatzScore(
      dist({
        medianDigitsAffected: 0,
        palmAffected: { any: true, confinedToUlnar: false },
        dorsumAffected: true,
      }),
    );
    expect(r.score).toBe(0);
  });
});

describe('calculateKatzScore — Classic (3)', () => {
  it('returns score 3 for 2 digits, no palm, no dorsum', () => {
    const r = calculateKatzScore(dist({ medianDigitsAffected: 2 }));
    expect(r.score).toBe(3);
    expect(r.classification).toMatch(/classic/i);
  });

  it('returns score 3 for 3 digits, no palm, no dorsum', () => {
    const r = calculateKatzScore(dist({ medianDigitsAffected: 3 }));
    expect(r.score).toBe(3);
  });
});

describe('calculateKatzScore — Probable (2)', () => {
  it('returns score 2 for 2 digits with non-ulnar palm, no dorsum', () => {
    const r = calculateKatzScore(
      dist({
        medianDigitsAffected: 2,
        palmAffected: { any: true, confinedToUlnar: false },
      }),
    );
    expect(r.score).toBe(2);
    expect(r.classification).toMatch(/probable/i);
  });

  it('does NOT return Probable when palm is confined to ulnar side', () => {
    // 2 digits + ulnar-only palm falls through to Possible (1),
    // because ulnar-confined palm is not a median-nerve pattern.
    const r = calculateKatzScore(
      dist({
        medianDigitsAffected: 2,
        palmAffected: { any: true, confinedToUlnar: true },
      }),
    );
    expect(r.score).toBe(1);
  });
});

describe('calculateKatzScore — Possible (1)', () => {
  it('returns score 1 for exactly 1 median digit, otherwise clean', () => {
    const r = calculateKatzScore(dist({ medianDigitsAffected: 1 }));
    expect(r.score).toBe(1);
    expect(r.classification).toMatch(/possible/i);
    expect(r.description).toMatch(/only 1 median nerve digit/i);
  });

  it('returns score 1 when 2 digits but dorsum is involved', () => {
    // dorsum involvement disqualifies Classic/Probable regardless of
    // digit count.
    const r = calculateKatzScore(
      dist({ medianDigitsAffected: 2, dorsumAffected: true }),
    );
    expect(r.score).toBe(1);
    expect(r.description).toMatch(/dorsum/i);
  });

  it('returns score 1 for 2 digits + ulnar-confined palm, with reason', () => {
    const r = calculateKatzScore(
      dist({
        medianDigitsAffected: 2,
        palmAffected: { any: true, confinedToUlnar: true },
      }),
    );
    expect(r.score).toBe(1);
    expect(r.description).toMatch(/ulnar/i);
  });
});

describe('calculateKatzScore — band ordering / precedence', () => {
  it('dorsum involvement always caps the score at 1, even with 3 digits', () => {
    const r = calculateKatzScore(
      dist({ medianDigitsAffected: 3, dorsumAffected: true }),
    );
    expect(r.score).toBe(1);
  });

  it('robustly returns score 0 for a malformed (undefined-digit) input', () => {
    // medianDigitsAffected === undefined hits none of the >= checks
    // and falls through to the final score-0 return. Confirms the
    // fallback is safe rather than throwing.
    const r = calculateKatzScore(dist({ medianDigitsAffected: undefined }));
    expect(r.score).toBe(0);
  });
});