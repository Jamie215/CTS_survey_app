/**
 * Katz Score - Hand Diagram Scoring for CTS Diagnosis
 *
 * Based on Katz et al. hand diagram scoring methodology.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, SOME_THRESHOLD, HALF_THRESHOLD } from '../data/constants';

/**
 * @typedef {Object} CoverageResult
 * @property {number} percentage
 * @property {number} coveredPixels
 * @property {number} totalPixels
 */

/**
 * @typedef {Object} PalmStatus
 * @property {boolean} radial
 * @property {boolean} ulnar
 * @property {boolean} any
 * @property {boolean} confinedToUlnar
 */

/**
 * @typedef {Object} SymptomDistribution
 * @property {number} medianDigitsAffected
 * @property {boolean} thumbAffected
 * @property {boolean} indexAffected
 * @property {boolean} middleAffected
 * @property {PalmStatus} palmAffected
 * @property {boolean} wristAffected
 * @property {boolean} dorsumAffected
 * @property {Object} details
 * @property {Object<string, number>} detailedCoverage
 * @property {Object<string, Object<string, number>>} coverageBySymptom
 */

/**
 * @typedef {Object} KatzResult
 * @property {number} score - 0-3
 * @property {string} classification
 * @property {string} description
 */

/**
 * Calculate coverage of a region for combined symptoms (all drawings).
 * @param {Array<Array>} allDrawings
 * @param {Path2D} regionPath
 * @returns {CoverageResult}
 */
export function calculateCombinedRegionCoverage(allDrawings, regionPath) {
  const flattenedDrawings = allDrawings.flat().filter(d => d);
  if (flattenedDrawings.length === 0) {
    return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
  }

  const regionCanvas = document.createElement('canvas');
  regionCanvas.width = CANVAS_WIDTH;
  regionCanvas.height = CANVAS_HEIGHT;
  const regionCtx = regionCanvas.getContext('2d');

  regionCtx.fillStyle = 'white';
  regionCtx.fill(regionPath);

  const regionImageData = regionCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const regionPixels = regionImageData.data;

  let totalRegionPixels = 0;
  for (let i = 0; i < regionPixels.length; i += 4) {
    if (regionPixels[i] > 200) {
      totalRegionPixels++;
    }
  }

  if (totalRegionPixels === 0) {
    return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
  }

  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = CANVAS_WIDTH;
  combinedCanvas.height = CANVAS_HEIGHT;
  const combinedCtx = combinedCanvas.getContext('2d');

  allDrawings.forEach(drawings => {
    if (!drawings || drawings.length === 0) return;

    combinedCtx.strokeStyle = 'red';
    combinedCtx.lineWidth = 12;
    combinedCtx.lineCap = 'round';
    combinedCtx.lineJoin = 'round';

    let isDrawing = false;
    drawings.forEach(point => {
      if (point.type === 'start') {
        combinedCtx.beginPath();
        combinedCtx.moveTo(point.x, point.y);
        isDrawing = true;
      } else if (point.type === 'draw' && isDrawing) {
        combinedCtx.lineTo(point.x, point.y);
        combinedCtx.stroke();
      } else if (point.type === 'end') {
        isDrawing = false;
      }
    });
  });

  const combinedImageData = combinedCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const combinedPixels = combinedImageData.data;

  let overlapPixels = 0;
  for (let i = 0; i < regionPixels.length; i += 4) {
    const isInRegion = regionPixels[i] > 200;
    const isDrawn = combinedPixels[i] > 50;

    if (isInRegion && isDrawn) {
      overlapPixels++;
    }
  }

  const coveragePercentage = totalRegionPixels > 0
    ? (overlapPixels / totalRegionPixels) * 100
    : 0;

  return {
    percentage: coveragePercentage,
    coveredPixels: overlapPixels,
    totalPixels: totalRegionPixels
  };
}

/**
 * Calculate coverage of a region for an individual symptom.
 * @param {Array} drawings
 * @param {Path2D} regionPath
 * @returns {CoverageResult}
 */
export function calculateRegionCoverage(drawings, regionPath) {
  if (!drawings || drawings.length === 0) {
    return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
  }

  const regionCanvas = document.createElement('canvas');
  regionCanvas.width = CANVAS_WIDTH;
  regionCanvas.height = CANVAS_HEIGHT;
  const regionCtx = regionCanvas.getContext('2d');

  regionCtx.fillStyle = 'white';
  regionCtx.fill(regionPath);

  const regionImageData = regionCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const regionPixels = regionImageData.data;

  let totalRegionPixels = 0;
  for (let i = 0; i < regionPixels.length; i += 4) {
    if (regionPixels[i] > 200) {
      totalRegionPixels++;
    }
  }

  if (totalRegionPixels === 0) {
    return { percentage: 0, coveredPixels: 0, totalPixels: 0 };
  }

  const drawingCanvas = document.createElement('canvas');
  drawingCanvas.width = CANVAS_WIDTH;
  drawingCanvas.height = CANVAS_HEIGHT;
  const drawingCtx = drawingCanvas.getContext('2d');

  drawingCtx.strokeStyle = 'red';
  drawingCtx.lineWidth = 12;
  drawingCtx.lineCap = 'round';
  drawingCtx.lineJoin = 'round';

  let isDrawing = false;
  drawings.forEach(point => {
    if (point.type === 'start') {
      drawingCtx.beginPath();
      drawingCtx.moveTo(point.x, point.y);
      isDrawing = true;
    } else if (point.type === 'draw' && isDrawing) {
      drawingCtx.lineTo(point.x, point.y);
      drawingCtx.stroke();
    } else if (point.type === 'end') {
      isDrawing = false;
    }
  });

  const drawingImageData = drawingCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const drawingPixels = drawingImageData.data;

  let overlapPixels = 0;
  for (let i = 0; i < regionPixels.length; i += 4) {
    const isInRegion = regionPixels[i] > 200;
    const isDrawn = drawingPixels[i] > 50;

    if (isInRegion && isDrawn) {
      overlapPixels++;
    }
  }

  const coveragePercentage = totalRegionPixels > 0
    ? (overlapPixels / totalRegionPixels) * 100
    : 0;

  return {
    percentage: coveragePercentage,
    coveredPixels: overlapPixels,
    totalPixels: totalRegionPixels
  };
}

/**
 * Derive symptom flags from a populated coverage map.
 *
 * @param {Object<string, number>} coverage - regionName → percentage (0–100)
 * @returns {Object} flags + details
 */
export function deriveSymptomFlags(coverage) {
  const thumbDistalCoverage = coverage['thumb_distal'] || 0;
  const thumbAffected = thumbDistalCoverage > SOME_THRESHOLD;

  const indexDistalCoverage = coverage['index_distal'] || 0;
  const indexMiddleCoverage = coverage['index_middle'] || 0;
  const indexAffected = (indexMiddleCoverage >= HALF_THRESHOLD) || (indexDistalCoverage > SOME_THRESHOLD);

  const middleDistalCoverage = coverage['middle_distal'] || 0;
  const middleMiddleCoverage = coverage['middle_middle'] || 0;
  const middleAffected = (middleMiddleCoverage >= HALF_THRESHOLD) || (middleDistalCoverage > SOME_THRESHOLD);

  let affectedDigits = 0;
  if (thumbAffected) affectedDigits++;
  if (indexAffected) affectedDigits++;
  if (middleAffected) affectedDigits++;

  const palmRadialCoverage = coverage['palm_radial'] || 0;
  const palmUlnarCoverage = coverage['palm_ulnar'] || 0;
  const palmRadialAffected = palmRadialCoverage > SOME_THRESHOLD;
  const palmUlnarAffected = palmUlnarCoverage > SOME_THRESHOLD;
  const palmAffected = palmRadialAffected || palmUlnarAffected;
  const palmConfinedToUlnar = palmUlnarAffected && !palmRadialAffected;

  const dorsumCoverage = coverage['dorsum'] || 0;
  const dorsumAffected = dorsumCoverage > SOME_THRESHOLD;

  const wristCoverage = coverage['wrist'] || 0;
  const wristAffected = wristCoverage > SOME_THRESHOLD;

  return {
    medianDigitsAffected: affectedDigits,
    thumbAffected,
    indexAffected,
    middleAffected,
    palmAffected: {
      radial: palmRadialAffected,
      ulnar: palmUlnarAffected,
      any: palmAffected,
      confinedToUlnar: palmConfinedToUlnar,
    },
    wristAffected,
    dorsumAffected,
    details: {
      thumb: { affected: thumbAffected, distal: thumbDistalCoverage, proximal: coverage['thumb_proximal'] || 0 },
      index: { affected: indexAffected, distal: indexDistalCoverage, middle: indexMiddleCoverage, proximal: coverage['index_proximal'] || 0 },
      middle: { affected: middleAffected, distal: middleDistalCoverage, middle: middleMiddleCoverage, proximal: coverage['middle_proximal'] || 0 },
      palm: { affected: palmAffected, radial: palmRadialCoverage, ulnar: palmUlnarCoverage, confinedToUlnar: palmConfinedToUlnar },
      wrist: { affected: wristAffected, coverage: wristCoverage },
      dorsum: { affected: dorsumAffected, coverage: dorsumCoverage },
    },
  };
}

/**
 * Analyze symptom distribution for a single hand.
 * @param {'Left'|'Right'} hand
 * @param {Object} svgRegions
 * @param {Object} handDiagramData
 * @returns {SymptomDistribution}
 */
export function analyzeSymptomDistribution(hand, svgRegions, handDiagramData) {
  const regionsFront = svgRegions[hand === 'Left' ? 'leftFront' : 'rightFront'];
  const regionsBack = svgRegions[hand === 'Left' ? 'leftBack' : 'rightBack'];

  if (!regionsFront || !regionsBack || Object.keys(regionsFront).length === 0 || Object.keys(regionsBack).length === 0) {
    console.warn('No SVG regions loaded for', hand);
    return {
      medianDigitsAffected: 0,
      palmAffected: { radial: false, ulnar: false, any: false, confinedToUlnar: false },
      wristAffected: false,
      dorsumAffected: false,
      thumbAffected: false,
      indexAffected: false,
      middleAffected: false,
      details: {},
      detailedCoverage: {},
      coverageBySymptom: {},
    };
  }

  const coverage = {};
  const coverageBySymptom = {
    tingling: {},
    numbness: {},
    pain: {}
  };

  const requiredFrontRegions = Object.keys(regionsFront);
  const requiredBackRegions = Object.keys(regionsBack);

  ['tingling', 'numbness', 'pain'].forEach(symptomType => {
    const frontKey = `${symptomType}Front${hand}`;
    const frontData = handDiagramData[frontKey] || [];
    const backKey = `${symptomType}Back${hand}`;
    const backData = handDiagramData[backKey] || [];

    requiredFrontRegions.forEach(regionName => {
      const regionData = regionsFront[regionName];
      if (!regionData) return;
      const regionCoverage = calculateRegionCoverage(frontData, regionData.path2D);
      coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
    });

    requiredBackRegions.forEach(regionName => {
      const regionData = regionsBack[regionName];
      if (!regionData) return;
      const regionCoverage = calculateRegionCoverage(backData, regionData.path2D);
      coverageBySymptom[symptomType][regionName] = regionCoverage.percentage;
    });
  });

  requiredFrontRegions.forEach(regionName => {
    const regionData = regionsFront[regionName];
    if (!regionData) return;
    const tinglingData = handDiagramData[`tinglingFront${hand}`] || [];
    const numbnessData = handDiagramData[`numbnessFront${hand}`] || [];
    const painData = handDiagramData[`painFront${hand}`] || [];
    const combinedCoverage = calculateCombinedRegionCoverage(
      [tinglingData, numbnessData, painData],
      regionData.path2D
    );
    coverage[regionName] = combinedCoverage.percentage;
  });

  requiredBackRegions.forEach(regionName => {
    const regionData = regionsBack[regionName];
    if (!regionData) return;
    const tinglingData = handDiagramData[`tinglingBack${hand}`] || [];
    const numbnessData = handDiagramData[`numbnessBack${hand}`] || [];
    const painData = handDiagramData[`painBack${hand}`] || [];
    const combinedCoverage = calculateCombinedRegionCoverage(
      [tinglingData, numbnessData, painData],
      regionData.path2D
    );
    coverage[regionName] = combinedCoverage.percentage;
  });

  const flags = deriveSymptomFlags(coverage);
  return {
    ...flags,
    detailedCoverage: coverage,
    coverageBySymptom,
  };
}

/**
 * Calculate Katz Score.
 *   3 (Classic): ≥2 digits, NO palm, NO dorsum
 *   2 (Probable): ≥2 digits, palm allowed unless confined to ulnar only, NO dorsum
 *   1 (Possible): ≥1 digit, may include dorsum
 *   0 (Unlikely): No volar shading in thumb, index, or middle
 * @param {SymptomDistribution} symptoms
 * @returns {KatzResult}
 */
export function calculateKatzScore(symptoms) {
  const { medianDigitsAffected, palmAffected, dorsumAffected } = symptoms;

  if (medianDigitsAffected === 0) {
    return {
      score: 0,
      classification: 'Unlikely CTS',
      description: 'No volar shading in thumb, index, or middle fingers'
    };
  }

  if (medianDigitsAffected >= 2 && !palmAffected.any && !dorsumAffected) {
    return {
      score: 3,
      classification: 'Classic CTS Symptom Distribution',
      description: 'Symptoms in 2+ median nerve digits (thumb, index, middle) with no palm or dorsum involvement'
    };
  }

  if (medianDigitsAffected >= 2 && !dorsumAffected) {
    if (palmAffected.any && !palmAffected.confinedToUlnar) {
      return {
        score: 2,
        classification: 'Probable CTS Symptom Distribution',
        description: 'Symptoms in 2+ median nerve digits with palm involvement (not confined to ulnar side)'
      };
    }
  }

  if (medianDigitsAffected >= 1) {
    let reason = '';
    if (dorsumAffected) {
      reason = ' (includes dorsum involvement)';
    } else if (palmAffected.confinedToUlnar) {
      reason = ' (palm symptoms confined to ulnar side)';
    } else if (medianDigitsAffected === 1) {
      reason = ' (only 1 median nerve digit affected)';
    }

    return {
      score: 1,
      classification: 'Possible CTS Symptom Distribution',
      description: `Symptoms in at least 1 median nerve digit${reason}`
    };
  }

  return {
    score: 0,
    classification: 'Unlikely CTS',
    description: 'Insufficient median nerve distribution pattern'
  };
}
