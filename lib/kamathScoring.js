/**
 * Kamath-based Score - Clinical Questionnaire Scoring for CTS Diagnosis
 *
 * Adapted from: Kamath V, Stothard J. A clinical questionnaire for the
 * diagnosis of carpal tunnel syndrome. J Hand Surg Am. 2003;28 B(5):455–459.
 *
 * Extended with additional discriminating questions for this application.
 */

import { ANSWERS } from '../data/constants';

/**
 * @typedef {Object} ScoredQuestion
 * @property {number} id
 * @property {string} answer
 * @property {number} score
 * @property {string} weight
 */

/**
 * @typedef {Object} SkippedQuestion
 * @property {number} id
 * @property {string} reason
 */

/**
 * @typedef {Object} ScoreBreakdown
 * @property {number} questionId
 * @property {string} answer
 * @property {number} points
 */

/**
 * @typedef {Object} KamathResult
 * @property {number} totalScore
 * @property {string} classification - 'Unlikely CTS' | 'Possible CTS: Unclear' | 'Classic / Probable CTS'
 * @property {string} colorClass - 'green' | 'yellow' | 'red'
 * @property {string} description
 * @property {ScoreBreakdown[]} breakdown
 * @property {ScoredQuestion[]} scoredQuestions
 * @property {SkippedQuestion[]} skippedQuestions
 * @property {number} maxPossibleScore
 * @property {number} minPossibleScore
 */

/**
 * Scoring weights for each question.
 * Keys match the question IDs from diagnosticQuestions.js
 *
 * Answer keys use the ANSWERS constant to guarantee parity with the
 * radio-button values emitted by DiagnosticQuestions.js. Hand-typed
 * string literals here were the source of a silent-drop bug previously
 * (id 7 'Not Relevant' vs 'Not relevant').
 */
export const kamathQuestionWeights = {
  // Q1 (id:0) - Gateway question, not scored
  0: null,

  // Q1a (id:1) - Tingling/numbness waking at night
  1: { [ANSWERS.YES]: 2, [ANSWERS.NO]: 0 },

  // Q1b (id:2) - Symptoms worse in morning
  2: { [ANSWERS.YES]: 1, [ANSWERS.NO]: 0 },

  // Q1c (id:3) - Symptoms mainly in thumb/index/middle (median distribution)
  3: { [ANSWERS.YES]: 2, [ANSWERS.NO]: 0 },

  // Q1d (id:4) - Trick movements relieve symptoms (flick sign)
  4: { [ANSWERS.YES]: 1, [ANSWERS.NO]: 0 },

  // Q1e (id:5) - Little finger tingling
  5: { [ANSWERS.YES]: -2, [ANSWERS.NO]: 0 },

  // Q1f (id:6) - Activities trigger symptoms
  6: { [ANSWERS.YES]: 1, [ANSWERS.NO]: 0 },

  // Q1g (id:7) - Pregnancy symptoms
  7: { [ANSWERS.YES]: 1, [ANSWERS.NO]: -1, [ANSWERS.NOT_RELEVANT]: 0 },

  // Q2 (id:8) - Wrist pain
  8: { [ANSWERS.YES]: 1, [ANSWERS.NO]: 0 },

  // Q3 (id:9) - Drop small objects (motor weakness)
  9: { [ANSWERS.YES]: 1, [ANSWERS.NO]: 0 },

  // Q4 (id:10) - Neck pain (suggests cervical radiculopathy)
  10: { [ANSWERS.YES]: -1, [ANSWERS.NO]: 0 },

  // Q5 (id:11) - Numbness/tingling in toes (suggests polyneuropathy)
  11: { [ANSWERS.YES]: -2, [ANSWERS.NO]: 0 },

  // Q6 (id:12) - Gateway question about trying wrist splint - not scored
  12: null,

  // Q6a (id:13) - Effectiveness of wrist splint
  13: { [ANSWERS.YES]: 2, [ANSWERS.NO]: 0 }
};

/**
 * Calculate the Kamath-based questionnaire CTS score.
 * @param {Object} answers - Object with question IDs as keys and answers as values
 * @param {boolean} hasNumbnessOrTingling - Whether user answered Yes to Q1
 * @returns {KamathResult}
 */
export const calculateKamathScore = (answers, hasNumbnessOrTingling) => {
  let totalScore = 0;
  const breakdown = [];
  const scoredQuestions = [];
  const skippedQuestions = [];

  Object.entries(kamathQuestionWeights).forEach(([questionId, weights]) => {
    const id = parseInt(questionId);
    const answer = answers[id];

    // Skip gateway question (id: 0) - it's not scored
    if (weights === null) {
      skippedQuestions.push({ id, reason: 'Gateway question - not scored' });
      return;
    }

    // Skip questions that require numbness/tingling if user answered No to Q1
    if (id >= 1 && id <= 7 && !hasNumbnessOrTingling) {
      skippedQuestions.push({ id, reason: 'Skipped - no numbness/tingling reported' });
      return;
    }

    if (id === 13 && answers[12] !== ANSWERS.YES) {
      skippedQuestions.push({ id, reason: 'Skipped - splint not tried' });
      return;
    }

    if (answer === undefined || answer === null) {
      skippedQuestions.push({ id, reason: 'Not answered' });
      return;
    }

    const score = weights[answer];

    if (score !== undefined) {
      totalScore += score;
      scoredQuestions.push({
        id,
        answer,
        score,
        weight: `${answer} = ${score >= 0 ? '+' : ''}${score}`
      });

      if (score !== 0) {
        breakdown.push({ questionId: id, answer, points: score });
      }
    } else {
      // Answer value isn't in the weight map for this question. This is a
      // data-integrity signal — surface it in skippedQuestions rather than
      // dropping it silently, so the export shows what happened.
      skippedQuestions.push({
        id,
        reason: `Invalid answer value: ${JSON.stringify(answer)}`,
      });
    }
  });

  let classification;
  let colorClass;
  let description;

  if (totalScore < 3) {
    classification = 'Unlikely CTS';
    colorClass = 'green';
    description = 'Based on questionnaire responses, symptoms are unlikely to be caused by Carpal Tunnel Syndrome.';
  } else if (totalScore >= 3 && totalScore <= 4) {
    classification = 'Possible CTS: Unclear';
    colorClass = 'yellow';
    description = 'Questionnaire results are inconclusive. Further clinical evaluation or nerve conduction studies may be helpful.';
  } else {
    classification = 'Classic / Probable CTS';
    colorClass = 'red';
    description = 'Questionnaire responses are consistent with Carpal Tunnel Syndrome.';
  }

  return {
    totalScore,
    classification,
    colorClass,
    description,
    breakdown,
    scoredQuestions,
    skippedQuestions,
    maxPossibleScore: calculateMaxScore(hasNumbnessOrTingling),
    minPossibleScore: calculateMinScore(hasNumbnessOrTingling)
  };
};

const calculateMaxScore = (hasNumbnessOrTingling) => {
  let max = 0;
  for (const [id, w] of Object.entries(kamathQuestionWeights)) {
    if (w === null) continue;
    const numId = Number(id);
    if (numId >= 1 && numId <= 7 && !hasNumbnessOrTingling) continue;
    max += Math.max(...Object.values(w));
  }
  return max;
};

const calculateMinScore = (hasNumbnessOrTingling) => {
  let min = 0;
  for (const [id, w] of Object.entries(kamathQuestionWeights)) {
    if (w === null) continue;
    const numId = Number(id);
    if (numId >= 1 && numId <= 7 && !hasNumbnessOrTingling) continue;
    min += Math.min(...Object.values(w));
  }
  return min;
};