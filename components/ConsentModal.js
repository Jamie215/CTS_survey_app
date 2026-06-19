"use client"

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import { consentContent } from '../data/consentContent';

/**
 * Two-tier consent modal shown on app entry.
 *
 *   Tier 1 (acknowledgment): required. Confirms user understands this
 *           is a screening tool, not a diagnosis.
 *   Tier 2 (data sharing):   optional. Opts in to REDCap submission.
 *
 * The modal cannot be dismissed without an explicit choice — no ESC,
 * no backdrop click, no X button. The user must either acknowledge
 * (with or without data sharing) or exit.
 *
 * @param {Object} props
 * @param {Function} props.onConsent  - Called with { shareData: bool }
 * @param {Function} props.onDecline  - Called when user opts to exit entirely
 */
export default function ConsentModal({ onConsent, onDecline }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [shareData, setShareData] = useState(false);
  const titleId = 'consent-modal-title';

  const canProceed = acknowledged && shareData; // Require both acknowledgement and data sharing to proceed

  const handleProceed = () => {
    if (!canProceed) return;
    onConsent({ shareData });
  };

  return (
    <Modal open={true} onClose={() => {}} titleId={titleId}>
      <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <ShieldCheck className="w-7 h-7 text-purple-600" />
      </div>

      <h2 id={titleId} className="text-2xl font-bold text-gray-800 mb-6">
        {consentContent.title}
      </h2>

      <div className="text-left space-y-6 mb-6 max-h-[50vh] overflow-y-auto pr-2">
        {/* Tier 1: acknowledgment */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {consentContent.acknowledgment.heading}
          </h3>
          {consentContent.acknowledgment.body.map((paragraph, i) => (
            <p key={i} className="text-gray-600 mb-2">
              {paragraph}
            </p>
          ))}
          <label className="flex items-start gap-3 mt-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-5 h-5 accent-purple-600 cursor-pointer"
            />
            <span className="text-gray-700 font-medium">
              {consentContent.acknowledgment.checkboxLabel}
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </span>
          </label>
        </section>

        {/* Tier 2: data sharing */}
        <section className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {consentContent.dataSharing.heading}
          </h3>
          {consentContent.dataSharing.body.map((paragraph, i) => (
            <p key={i} className="text-gray-600 mb-2">
              {paragraph}
            </p>
          ))}
          <div className="flex flex-col gap-2 mt-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={shareData}
                onChange={(e) => setShareData(e.target.checked)}
                className="mt-1 w-5 h-5 accent-purple-600 cursor-pointer"
              />
              <span className="text-gray-700 font-medium">
                {consentContent.dataSharing.checkboxLabel}
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              </span>
            </label>
          </div>
        </section>
      </div>

      <div className="flex gap-4 justify-center pt-4 border-t border-gray-200">
        <button
          onClick={onDecline}
          className="flex-1 px-6 py-4 bg-gray-100 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-purple-300"
        >
          {consentContent.buttons.declineAll}
        </button>
        <button
          onClick={handleProceed}
          disabled={!canProceed}
          className={`flex-1 px-6 py-4 rounded-xl text-lg font-semibold transition-colors border-2 border-transparent ${
            canProceed
              ? 'bg-purple-600 text-white hover:bg-purple-700 hover:border-purple-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {consentContent.buttons.proceed}
        </button>
      </div>
    </Modal>
  );
}