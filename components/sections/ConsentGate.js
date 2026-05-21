"use client"

import React from 'react';
import ConsentModal from './ConsentModal';

/**
 * Gates the survey behind two-tier consent.
 *
 * - If consent has not been acknowledged, renders the consent modal
 *   over a minimal background (no survey content leaks through).
 * - If the user declines, renders a static exit screen.
 * - Once acknowledged, renders children with consent state passed in
 *   via render prop so CTSSurvey can thread it into useExport.
 *
 * TODO: The decline pathway is deliberately a dead-end screen for now;
 * the final behaviour (redirect vs static screen vs alternate flow)
 * is pending PI direction.
 */
export default function ConsentGate({ consent, onDecline, declined, children }) {
  if (declined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Thank you
          </h2>
          <p className="text-gray-600 text-lg">
            This survey requires consent to proceed. You may safely close
            this tab.
          </p>
        </div>
      </div>
    );
  }

  if (!consent.acknowledged) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ConsentModal
          onConsent={consent.grantConsent}
          onDecline={onDecline}
        />
      </div>
    );
  }

  return children;
}