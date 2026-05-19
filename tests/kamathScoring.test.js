import { describe, it, expect } from 'vitest';
import {
  calculateKamathScore,
  kamathQuestionWeights,
} from '../lib/kamathScoring';

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

// id 7 'Not Relevant' = 0 is used for the baseline so the pregnancy
// question itself contributes nothing unless a test overrides it.
function base(overrides = {}) {
  const answers = {
    0: 'Yes',            // gateway for numbness/tingling questions
    1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No',
    7: 'Not Relevant',
    8: 'No', 9: 'No', 10: 'No', 11: 'No',
    12: 'No',            // splint gateway
  };
  return { ...answers, ...overrides };
}

describe('calculateKamathScore — gateway questions', () => {
  it('always skips id 0 and id 12 regardless of answer', () => {
    const result = calculateKamathScore(base({ 0: 'Yes', 12: 'Yes' }), true);
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
    const result = calculateKamathScore(base({ 1: 'Yes' }), true);
    const scored1 = result.scoredQuestions.find((q) => q.id === 1);
    expect(scored1).toBeDefined();
    expect(scored1.score).toBe(2);
  });
});

describe('calculateKamathScore — splint gateway (id 13)', () => {
  it('scores id 13 only when id 12 answer is "Yes"', () => {
    const result = calculateKamathScore(
      base({ 12: 'Yes', 13: 'Yes' }),
      false,
    );
    const scored13 = result.scoredQuestions.find((q) => q.id === 13);
    expect(scored13).toBeDefined();
    expect(scored13.score).toBe(2);
  });

  it('skips id 13 when id 12 is "No"', () => {
    const result = calculateKamathScore(base({ 12: 'No' }), false);
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
   * Documents current behaviour: an answer not present in the weight
   * map (e.g. "Maybe") produces score === undefined and is added to
   * NEITHER scoredQuestions NOR skippedQuestions — it silently
   * disappears. For a clinical instrument this is a data-integrity
   * gap; this test exists so the behaviour is visible and a
   * deliberate decision can be made (throw? record?).
   */
  it('silently drops an unrecognised answer value (documents a gap)', () => {
    const result = calculateKamathScore(base({ 8: 'Maybe' }), true);
    const inScored = result.scoredQuestions.some((q) => q.id === 8);
    const inSkipped = result.skippedQuestions.some((q) => q.id === 8);
    expect(inScored).toBe(false);
    expect(inSkipped).toBe(false);
  });
});

describe('calculateKamathScore — individual weights', () => {
  it('id 3 (median distribution) scores +2 on Yes', () => {
    const result = calculateKamathScore(base({ 3: 'Yes' }), true);
    expect(result.totalScore).toBe(2);
  });

  it('id 5 (little finger) scores -2 on Yes, 0 on No (inverted)', () => {
    const yes = calculateKamathScore(base({ 5: 'Yes' }), true);
    expect(yes.totalScore).toBe(-2);
    const no = calculateKamathScore(base({ 5: 'No' }), true);
    expect(no.totalScore).toBe(0);
  });

  it('id 10 (neck pain) scores -1 on Yes', () => {
    const result = calculateKamathScore(base({ 10: 'Yes' }), true);
    expect(result.totalScore).toBe(-1);
  });

  it('id 11 (toe symptoms) scores -2 on Yes', () => {
    const result = calculateKamathScore(base({ 11: 'Yes' }), true);
    expect(result.totalScore).toBe(-2);
  });

  it('id 7 pregnancy: Yes +1, No -1', () => {
    const yes = calculateKamathScore(base({ 7: 'Yes' }), true);
    expect(yes.totalScore).toBe(1);
    const no = calculateKamathScore(base({ 7: 'No' }), true);
    expect(no.totalScore).toBe(-1);
  });

  /**
   * KNOWN BUG — expected to FAIL until fixed.
   *
   * The UI (DiagnosticQuestions.js) stores the pregnancy option as
   * 'Not relevant' (lowercase r). The weight map key is 'Not Relevant'
   * (capital R). So weights['Not relevant'] is undefined, the answer is
   * silently dropped, and id 7 lands in neither scoredQuestions nor
   * skippedQuestions. The total is unaffected only because the intended
   * weight is 0 — but the answer vanishes from the breakdown entirely.
   *
   * Fix: change the weight-map key (and calculateMin/MaxScore comments)
   * to 'Not relevant' to match the UI. Then this test passes.
   */
  it('id 7 "Not relevant" (as stored by the UI) is recorded', () => {
    const result = calculateKamathScore(base({ 7: 'Not relevant' }), true);
    const inScored = result.scoredQuestions.some((q) => q.id === 7);
    const inSkipped = result.skippedQuestions.some((q) => q.id === 7);
    expect(inScored || inSkipped).toBe(true);
  });
});

describe('calculateKamathScore — classification boundaries', () => {
  const numbnessBase = (over) => base(over);

  it('total 2 → Unlikely CTS (green)', () => {
    const r = calculateKamathScore(numbnessBase({ 1: 'Yes' }), true);
    expect(r.totalScore).toBe(2);
    expect(r.classification).toBe('Unlikely CTS');
    expect(r.colorClass).toBe('green');
  });

  it('total 3 → Possible CTS: Unclear (yellow)', () => {
    const r = calculateKamathScore(
      numbnessBase({ 1: 'Yes', 2: 'Yes' }),
      true,
    );
    expect(r.totalScore).toBe(3);
    expect(r.classification).toBe('Possible CTS: Unclear');
    expect(r.colorClass).toBe('yellow');
  });

  it('total 4 → Possible CTS: Unclear (yellow)', () => {
    const r = calculateKamathScore(
      numbnessBase({ 1: 'Yes', 2: 'Yes', 4: 'Yes' }),
      true,
    );
    expect(r.totalScore).toBe(4);
    expect(r.classification).toBe('Possible CTS: Unclear');
  });

  it('total 5 → Classic / Probable CTS (red)', () => {
    const r = calculateKamathScore(
      numbnessBase({ 1: 'Yes', 2: 'Yes', 4: 'Yes', 6: 'Yes' }),
      true,
    );
    expect(r.totalScore).toBe(5);
    expect(r.classification).toBe('Classic / Probable CTS');
    expect(r.colorClass).toBe('red');
  });

  it('a negative total still classifies as Unlikely CTS', () => {
    const r = calculateKamathScore(
      numbnessBase({ 5: 'Yes', 10: 'Yes', 11: 'Yes' }),
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
   * The literals are already stale today — this test should FAIL until
   * they are recomputed.
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