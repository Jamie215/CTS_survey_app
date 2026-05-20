"use client"

import { useState, useCallback } from 'react';
import { calculateKamathScore } from '../lib/kamathScoring';
import { calculateKatzScore, analyzeSymptomDistribution } from '../lib/katzScoring';

/**
 * Custom hook for CTS scoring calculations.
 *
 * @param {Object} diagnosticAnswers
 * @param {boolean|null} hasNumbnessOrTingling
 * @param {Object} svgRegions
 * @param {Object} handDiagramData
 * @returns {Object}
 */
export function useScoring(diagnosticAnswers, hasNumbnessOrTingling, svgRegions, handDiagramData) {
  const [assessmentResults, setAssessmentResults] = useState(null);

  const analyzeSingleHand = useCallback((hand) => {
    const symptoms = analyzeSymptomDistribution(hand, svgRegions, handDiagramData);
    return {
      KatzScore: {
        ...calculateKatzScore(symptoms),
        coverageBySymptom: symptoms.coverageBySymptom,
      },
      detailedCoverage: symptoms.detailedCoverage,
      // Per-digit / palm / dorsum flags from analyzeSymptomDistribution.
      flags: {
        thumbAffected: symptoms.thumbAffected,
        indexAffected: symptoms.indexAffected,
        middleAffected: symptoms.middleAffected,
        medianDigitsAffected: symptoms.medianDigitsAffected,
        palmAffected: symptoms.palmAffected,
        dorsumAffected: symptoms.dorsumAffected,
        wristAffected: symptoms.wristAffected,
      },
    };
  }, [svgRegions, handDiagramData]);

  const handleCalculateScores = useCallback(() => {
    const kamathScore = calculateKamathScore(diagnosticAnswers, hasNumbnessOrTingling);
    const katzScores = {
      left: analyzeSingleHand('Left'),
      right: analyzeSingleHand('Right')
    };

    const results = {
      kamath: kamathScore,
      katz: katzScores
    };

    setAssessmentResults(results);
    return results;
  }, [diagnosticAnswers, hasNumbnessOrTingling, analyzeSingleHand]);

  return {
    assessmentResults,
    handleCalculateScores,
  };
}