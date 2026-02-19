/**
 * Kamath Score - Clinical Questionnaire Scoring for CTS Diagnosis
 * 
 * Based on: Kamath V, Stothard J. A clinical questionnaire for the diagnosis of 
 * carpal tunnel syndrome. J Hand Surg Am. 2003;28 B(5):455–459.
 * 
 * Extended with additional discriminating questions for this application.
 */

/**
 * Scoring weights for each question
 * Keys match the question IDs from diagnosticQuestions.js
 */
export const kamathQuestionWeights = {
  // Q1 (id:0) - Gateway question, not scored
  0: null,
  
  // Q1a (id:1) - Tingling/numbness waking at night
  1: { Yes: 1, No: 0 },
  
  // Q1b (id:2) - Symptoms worse in morning
  2: { Yes: 1, No: 0 },
  
  // Q1c (id:3) - Symptoms mainly in thumb/index/middle (median distribution)
  // Custom question - strong positive indicator
  3: { Yes: 2, No: -1 },
  
  // Q1d (id:4) - Trick movements relieve symptoms (flick sign)
  4: { Yes: 1, No: 0 },
  
  // Q1e (id:5) - Little finger tingling
  // IMPORTANT: Inverted scoring - NO is positive for CTS
  5: { Yes: -1, No: 2 },
  
  // Q1f (id:6) - Activities trigger symptoms
  6: { Yes: 1, No: 0 },
  
  // Q1g (id:7) - Pregnancy symptoms
  7: { Yes: 1, No: -1, 'Not Relevant': 0 },
  
  // Q2 (id:8) - Wrist pain waking at night
  8: { Yes: 1, No: 0 },
  
  // Q3 (id:9) - Drop small objects (motor weakness)
  // Custom question - indicates thenar weakness
  9: { Yes: 1, No: 0 },
  
  // Q4 (id:10) - Neck pain (suggests cervical radiculopathy)
  10: { Yes: -1, No: 0 },
  
  // Q5 (id:11) - Numbness/tingling in toes (suggests polyneuropathy)
  // Custom question - strong negative indicator
  11: { Yes: -2, No: 0 },
  
  // Q6 (id:12) - Splint helped
  12: { Yes: 2, No: 0, 'Not Relevant': 0 }
};

/**
 * Classification thresholds based on Kamath & Stothard scoring (May need to update this based on the extended questions and scoring)
 */
export const kamathThresholds = {
  unlikely: { max: 2, label: 'Unlikely CTS', color: 'green' },
  unclear: { min: 3, max: 4, label: 'Unclear', color: 'yellow' },
  likely: { min: 5, label: 'Likely CTS', color: 'red' }
};

/**
 * Calculate the Kamath questionnaire-based CTS score
 * @param {Object} answers - Object with question IDs as keys and answers as values
 * @param {boolean} hasNumbnessOrTingling - Whether user answered Yes to Q1
 * @returns {Object} Score results including total, classification, and breakdown
 */
export const calculateKamathScore = (answers, hasNumbnessOrTingling) => {
  let totalScore = 0;
  const breakdown = [];
  const scoredQuestions = [];
  const skippedQuestions = [];

  // Iterate through all scoring rules
  Object.entries(kamathQuestionWeights).forEach(([questionId, weights]) => {
    const id = parseInt(questionId);
    const answer = answers[id];
    
    // Skip gateway question (id: 0) - it's not scored
    if (weights === null) {
      skippedQuestions.push({ id, reason: 'Gateway question - not scored' });
      return;
    }
    
    // Skip questions that require numbness/tingling if user answered No to Q1
    // Questions 1-7 (ids 1-7) require numbness/tingling
    if (id >= 1 && id <= 7 && !hasNumbnessOrTingling) {
      skippedQuestions.push({ id, reason: 'Skipped - no numbness/tingling reported' });
      return;
    }
    
    // If question wasn't answered, skip it
    if (answer === undefined || answer === null) {
      skippedQuestions.push({ id, reason: 'Not answered' });
      return;
    }
    
    // Get the score for this answer
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
        breakdown.push({
          questionId: id,
          answer,
          points: score
        });
      }
    }
  });

  // Determine classification
  let classification;
  let colorClass;
  let description;
  
  if (totalScore < 3) {
    classification = 'Unlikely CTS';
    colorClass = 'green';
    description = 'Based on questionnaire responses, symptoms are unlikely to be caused by Carpal Tunnel Syndrome.';
  } else if (totalScore >= 3 && totalScore <= 4) {
    classification = 'Unclear';
    colorClass = 'yellow';
    description = 'Questionnaire results are inconclusive. Further clinical evaluation or nerve conduction studies may be helpful.';
  } else {
    classification = 'Likely CTS';
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

/**
 * Calculate maximum possible score (all positive answers)
 */
const calculateMaxScore = (hasNumbnessOrTingling) => {
  let max = 0;
  
  if (hasNumbnessOrTingling) {
    // Q1a-Q1f, Q1g (if Yes), Q2, Q3, Q6
    max = 1 + 1 + 2 + 1 + 3 + 1 + 1 + 1 + 1 + 2; // = 14
  } else {
    // Only Q2, Q3, Q6
    max = 1 + 1 + 2; // = 4
  }
  
  return max;
};

/**
 * Calculate minimum possible score (worst case negative)
 */
const calculateMinScore = (hasNumbnessOrTingling) => {
  let min = 0;
  
  if (hasNumbnessOrTingling) {
    // Q1c No (-1), Q1g No (-1), Q4 Yes (-1), Q5 Yes (-2)
    min = -1 + -1 + -1 + -2; // = -5
  } else {
    // Q4 Yes (-1), Q5 Yes (-2)
    min = -1 + -2; // = -3
  }
  
  return min;
};