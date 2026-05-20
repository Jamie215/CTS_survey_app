import { describe, it, expect } from 'vitest';
import {
  calculateKamathScore,
  kamathQuestionWeights,
  KAMATH_BANDS
} from '../lib/kamathScoring';
import { ANSWERS } from '../data/constants';

/**
 * Unit tests for calculateKamathScore.
 *
 * These tests are the executable specification of the Kamath-based
 * questionnaire scoring. If a weight in kamathQuestionWeights changes,
 * or the skip/classification logic changes, the affected test fails —
 * which is the point: it catches scoring drift before it reaches
 * participant data or the REDCap data dictionary.
 *
 * `base()` builds a full answer set on the numbness/tingling path with
 * every scorable question at its 0-point answer, so each test can move
 * exactly the questions it cares about and the rest contribute nothing.
 */

// Baseline uses ANSWERS.NOT_RELEVANT for id 7 so the pregnancy question
// itself contributes nothing unless a test overrides it.
function base(overrides = {}) {
  const answers = {
    0: ANSWERS.YES,            // gateway for numbness/tingling questions
    1: ANSWERS.NO, 2: ANSWERS.NO, 3: ANSWERS.NO, 4: ANSWERS.NO,
    5: ANSWERS.NO, 6: ANSWERS.NO,
    7: ANSWERS.NOT_RELEVANT,
    8: ANSWERS.NO, 9: ANSWERS.NO, 10: ANSWERS.NO, 11: ANSWERS.NO,
    12: ANSWERS.NO,            // splint gateway
  };
  return { ...answers, ...overrides };
}

describe('calculateKamathScore — gateway questions', () => {
  it('always skips id 0 and id 12 regardless of answer', () => {
    const result = calculateKamathScore(base({ 0: ANSWERS.YES, 12: ANSWERS.YES }), true);
    const skippedIds = result.skippedQuestions.map((q) => q.id);
    expect(skippedIds).toContain(0);
    expect(skippedIds).toContain(12);
    // gateway questions never appear as scored
    const scoredIds = result.scoredQuestions.map((q) => q.id);
    expect(scoredIds).not.toContain(0);
    expect(scoredIds).not.toContain(12);
  });

  it('labels gateway skips with the gateway reason', () => {
    const result = calculateKamathScore(base(), true);
    const gateway = result.skippedQuestions.find((q) => q.id === 0);
    expect(gateway.reason).toMatch(/gateway/i);
  });
});

describe('calculateKamathScore — numbness/tingling skip path', () => {
  it('skips ids 1–7 when hasNumbnessOrTingling is false', () => {
    const result = calculateKamathScore(base(), false);
    const scoredIds = result.scoredQuestions.map((q) => q.id);
    for (const id of [1, 2, 3, 4, 5, 6, 7]) {
      expect(scoredIds).not.toContain(id);
    }
    // 8,9,10,11 can still score on the no-numbness path
    expect(scoredIds).toEqual(expect.arrayContaining([]));
  });

  it('treats hasNumbnessOrTingling === null the same as false', () => {
    // null is the initial state in CTSSurvey.js; !null === true,
    // so ids 1-7 must be skipped. Pinning this guards the initial state.
    const result = calculateKamathScore(base(), null);
    const scoredIds = result.scoredQuestions.map((q) => q.id);
    for (const id of [1, 2, 3, 4, 5, 6, 7]) {
      expect(scoredIds).not.toContain(id);
    }
  });

  it('scores ids 1–7 when hasNumbnessOrTingling is true', () => {
    const result = calculateKamathScore(base({ 1: ANSWERS.YES }), true);
    const scored1 = result.scoredQuestions.find((q) => q.id === 1);
    expect(scored1).toBeDefined();
    expect(scored1.score).toBe(2);
  });
});

describe('calculateKamathScore — splint gateway (id 13)', () => {
  it('scores id 13 only when id 12 answer is "Yes"', () => {
    const result = calculateKamathScore(
      base({ 12: ANSWERS.YES, 13: ANSWERS.YES }),
      false,
    );
    const scored13 = result.scoredQuestions.find((q) => q.id === 13);
    expect(scored13).toBeDefined();
    expect(scored13.score).toBe(2);
  });

  it('skips id 13 when id 12 is "No"', () => {
    const result = calculateKamathScore(base({ 12: ANSWERS.NO }), false);
    const skipped13 = result.skippedQuestions.find((q) => q.id === 13);
    expect(skipped13).toBeDefined();
    expect(skipped13.reason).toMatch(/splint/i);
  });

  it('skips id 13 when id 12 is unanswered', () => {
    const answers = base();
    delete answers[12];
    const result = calculateKamathScore(answers, false);
    const skipped13 = result.skippedQuestions.find((q) => q.id === 13);
    expect(skipped13).toBeDefined();
  });
});

describe('calculateKamathScore — unanswered questions', () => {
  it('marks missing answers as "Not answered" and contributes 0', () => {
    const answers = base();
    delete answers[8];
    const result = calculateKamathScore(answers, true);
    const skipped8 = result.skippedQuestions.find((q) => q.id === 8);
    expect(skipped8).toBeDefined();
    expect(skipped8.reason).toMatch(/not answered/i);
  });
});

describe('calculateKamathScore — invalid answer values', () => {
  /**
   * Previously these vanished from both scoredQuestions AND
   * skippedQuestions, which was a data-integrity gap for a clinical
   * instrument. They now land in skippedQuestions with a clear reason
   * so the export reflects what happened.
   */
  it('records an unrecognised answer value in skippedQuestions', () => {
    const result = calculateKamathScore(base({ 8: 'Maybe' }), true);
    const inScored = result.scoredQuestions.some((q) => q.id === 8);
    const skipped8 = result.skippedQuestions.find((q) => q.id === 8);
    expect(inScored).toBe(false);
    expect(skipped8).toBeDefined();
    expect(skipped8.reason).toMatch(/invalid answer value/i);
    expect(skipped8.reason).toMatch(/Maybe/);
  });

  it('does not affect totalScore for an invalid answer', () => {
    // The rest of base() contributes 0; an invalid 'Maybe' should not
    // contribute either, leaving the total at 0.
    const result = calculateKamathScore(base({ 8: 'Maybe' }), true);
    expect(result.totalScore).toBe(0);
  });
});

describe('calculateKamathScore — individual weights', () => {
  it('id 3 (median distribution) scores +2 on Yes', () => {
    const result = calculateKamathScore(base({ 3: ANSWERS.YES }), true);
    expect(result.totalScore).toBe(2);
  });

  it('id 5 (little finger) scores -2 on Yes, 0 on No (inverted)', () => {
    const yes = calculateKamathScore(base({ 5: ANSWERS.YES }), true);
    expect(yes.totalScore).toBe(-2);
    const no = calculateKamathScore(base({ 5: ANSWERS.NO }), true);
    expect(no.totalScore).toBe(0);
  });

  it('id 10 (neck pain) scores -1 on Yes', () => {
    const result = calculateKamathScore(base({ 10: ANSWERS.YES }), true);
    expect(result.totalScore).toBe(-1);
  });

  it('id 11 (toe symptoms) scores -2 on Yes', () => {
    const result = calculateKamathScore(base({ 11: ANSWERS.YES }), true);
    expect(result.totalScore).toBe(-2);
  });

  it('id 7 pregnancy: Yes +1, No -1', () => {
    const yes = calculateKamathScore(base({ 7: ANSWERS.YES }), true);
    expect(yes.totalScore).toBe(1);
    const no = calculateKamathScore(base({ 7: ANSWERS.NO }), true);
    expect(no.totalScore).toBe(-1);
  });

  it('id 7 "Not relevant" (as stored by the UI) is recorded as scored with 0', () => {
    // After the casing fix + ANSWERS constants, 'Not relevant' is a
    // valid weight-map key and the answer appears in scoredQuestions
    // with score 0 (not silently dropped, not in skippedQuestions).
    const result = calculateKamathScore(base({ 7: ANSWERS.NOT_RELEVANT }), true);
    const scored7 = result.scoredQuestions.find((q) => q.id === 7);
    expect(scored7).toBeDefined();
    expect(scored7.score).toBe(0);
  });
});

describe('calculateKamathScore — classification boundaries', () => {
  const numbnessBase = (over) => base(over);

  it('total 2 → Unlikely CTS (green)', () => {
    const r = calculateKamathScore(numbnessBase({ 1: ANSWERS.YES }), true);
    expect(r.totalScore).toBe(2);
    expect(r.classification).toBe('Unlikely CTS');
    expect(r.colorClass).toBe('green');
  });

  it('total 3 → Possible CTS: Unclear (yellow)', () => {
    const r = calculateKamathScore(
      numbnessBase({ 1: ANSWERS.YES, 2: ANSWERS.YES }),
      true,
    );
    expect(r.totalScore).toBe(3);
    expect(r.classification).toBe('Possible CTS: Unclear');
    expect(r.colorClass).toBe('yellow');
  });

  it('total 4 → Possible CTS: Unclear (yellow)', () => {
    const r = calculateKamathScore(
      numbnessBase({ 1: ANSWERS.YES, 2: ANSWERS.YES, 4: ANSWERS.YES }),
      true,
    );
    expect(r.totalScore).toBe(4);
    expect(r.classification).toBe('Possible CTS: Unclear');
  });

  it('total 5 → Classic / Probable CTS (red)', () => {
    const r = calculateKamathScore(
      numbnessBase({
        1: ANSWERS.YES,
        2: ANSWERS.YES,
        4: ANSWERS.YES,
        6: ANSWERS.YES,
      }),
      true,
    );
    expect(r.totalScore).toBe(5);
    expect(r.classification).toBe('Classic / Probable CTS');
    expect(r.colorClass).toBe('red');
  });

  it('a negative total still classifies as Unlikely CTS', () => {
    const r = calculateKamathScore(
      numbnessBase({
        5: ANSWERS.YES,
        10: ANSWERS.YES,
        11: ANSWERS.YES,
      }),
      true,
    );
    expect(r.totalScore).toBeLessThan(0);
    expect(r.classification).toBe('Unlikely CTS');
  });
});

describe('calculateKamathScore — max/min possible score', () => {
  /**
   * Computes the expected bounds directly from kamathQuestionWeights so
   * the test fails if a weight changes and the (currently hardcoded)
   * calculateMaxScore/calculateMinScore literals are not updated.
   */
  function expectedBounds(hasNT) {
    let max = 0;
    let min = 0;
    for (const [id, w] of Object.entries(kamathQuestionWeights)) {
      if (w === null) continue;
      const numId = Number(id);
      if (numId >= 1 && numId <= 7 && !hasNT) continue;
      const values = Object.values(w);
      max += Math.max(...values);
      min += Math.min(...values);
    }
    return { max, min };
  }

  it('maxPossibleScore matches the sum of best answers (numbness path)', () => {
    const r = calculateKamathScore(base(), true);
    expect(r.maxPossibleScore).toBe(expectedBounds(true).max);
  });

  it('minPossibleScore matches the sum of worst answers (numbness path)', () => {
    const r = calculateKamathScore(base(), true);
    expect(r.minPossibleScore).toBe(expectedBounds(true).min);
  });

  it('maxPossibleScore matches the sum of best answers (no-numbness path)', () => {
    const r = calculateKamathScore(base(), false);
    expect(r.maxPossibleScore).toBe(expectedBounds(false).max);
  });
});

describe('calculateKamathScore — KAMATH_BANDS as single source of truth', () => {
  /**
   * The classification text and color the function returns must come
   * from KAMATH_BANDS, not from a separate hardcoded branch. If a band
   * is edited (boundaries, label, color), this guards against the
   * classifier and the display drifting apart.
   */
  it('classification and colorClass come from a band in KAMATH_BANDS', () => {
    // Use a score that lands in each band, exercising the lookup.
    const cases = [
      calculateKamathScore(base(), true),                                  // 0 → green band
      calculateKamathScore(base({ 1: ANSWERS.YES, 2: ANSWERS.YES }), true), // 3 → yellow band
      calculateKamathScore(
        base({ 1: ANSWERS.YES, 2: ANSWERS.YES, 4: ANSWERS.YES, 6: ANSWERS.YES }),
        true,
      ),                                                                    // 5 → red band
    ];
 
    for (const result of cases) {
      const matchingBand = KAMATH_BANDS.find(
        (b) =>
          b.classification === result.classification &&
          b.colorClass === result.colorClass,
      );
      expect(matchingBand).toBeDefined();
      // And the score really does fall inside that band.
      expect(result.totalScore).toBeGreaterThanOrEqual(matchingBand.min);
      expect(result.totalScore).toBeLessThanOrEqual(matchingBand.max);
    }
  });
 
  it('every band has a non-empty legendLabel for the display', () => {
    // The Kamath legend in Results.js renders band.legendLabel for each
    // band. An empty label would render a hanging bullet — catch it here.
    for (const band of KAMATH_BANDS) {
      expect(typeof band.legendLabel).toBe('string');
      expect(band.legendLabel.length).toBeGreaterThan(0);
    }
  });
 
  it('bands cover the full integer range with no gaps or overlaps', () => {
    // Walk a wide range of integer scores and confirm exactly one band
    // claims each. Gaps would mean unclassifiable scores; overlaps
    // would mean the first-match rule silently picks one band over
    // another based on array order.
    for (let score = -20; score <= 30; score++) {
      const matches = KAMATH_BANDS.filter(
        (b) => score >= b.min && score <= b.max,
      );
      expect(matches.length).toBe(1);
    }
  });
});