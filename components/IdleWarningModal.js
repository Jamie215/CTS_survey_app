"use client"

import React, { useRef } from 'react';
import { Clock } from 'lucide-react';
import Modal from './Modal';

/**
 * Idle-timeout warning. Driven by useIdleTimeout.
 *
 * @param {Object} props
 * @param {number} props.secondsRemaining - Countdown value to display
 * @param {Function} props.onDismiss      - Reset the idle timer
 * @param {Function} props.onEndNow       - Immediately trigger timeout
 */
export default function IdleWarningModal({ secondsRemaining, onDismiss, onEndNow }) {
  const titleId = 'idle-warning-title';
  // Auto-focus the safer action so a quick Enter keypress keeps the
  // session. Escape (via Modal's onClose) also dismisses.
  const dismissBtnRef = useRef(null);

  return (
    <Modal
      open={true}
      onClose={onDismiss}
      titleId={titleId}
      initialFocusRef={dismissBtnRef}
    >
      <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <Clock className="w-7 h-7 text-yellow-600" />
      </div>
      <h2 id={titleId} className="text-xl font-bold text-gray-800 mb-3">
        Still there?
      </h2>
      <p className="text-gray-500 text-lg mb-2">
        To protect your privacy, this session will reset in{' '}
        <span
          className="font-semibold text-gray-800"
          aria-live="polite"
          aria-atomic="true"
        >
          {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}
        </span>.
      </p>
      <p className="text-gray-500 text-base mb-8">
        Any responses you&apos;ve entered will not be saved.
      </p>
      <div className="flex gap-4 justify-center">
        <button
          ref={dismissBtnRef}
          onClick={onDismiss}
          className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors border-2 border-transparent hover:border-purple-800"
        >
          I&apos;m still here
        </button>
        <button
          onClick={onEndNow}
          className="flex-1 px-6 py-4 bg-gray-100 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-purple-300"
        >
          End session
        </button>
      </div>
    </Modal>
  );
}