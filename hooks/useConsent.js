"use client"

import { useState, useCallback } from 'react';
import { CONSENT_VERSION } from '../data/constants';

/**
 * Session-only consent state for the CTS survey.
 *
 * Two tiers:
 *   - acknowledged: required to proceed. Confirms the user understands
 *     this is a screening tool, not a diagnosis.
 *   - dataSharing: optional. Permission to submit anonymized results
 *     to the REDCap research database.
 *
 * No persistence: each session starts fresh.
 *  
 * The acknowledgedAt timestamp and version are intended to travel with
 * the export payload so REDCap records carry consent provenance.
 */
export function useConsent() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [dataSharing, setDataSharing] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState(null);

  const grantConsent = useCallback(({ shareData }) => {
    setAcknowledged(true);
    setDataSharing(!!shareData);
    setAcknowledgedAt(new Date().toISOString());
  }, []);

  // Allow the user to change their data-sharing preference later
  // (e.g. from the Results section) without re-acknowledging.
  const updateDataSharing = useCallback((shareData) => {
    setDataSharing(!!shareData);
  }, []);

  return {
    acknowledged,
    dataSharing,
    acknowledgedAt,
    version: CONSENT_VERSION,
    grantConsent,
    updateDataSharing,
  };
}