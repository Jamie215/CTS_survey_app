"use client"

import React from 'react';
import { CircleAlert } from 'lucide-react';

/**
 * Confirmation modal shown when the user attempts to calculate scores
 * without marking anything on the hand diagrams. Gives them a chance
 * to go back and draw, or to confirm that no symptoms are intentional.
 *
 * @param {Object} props
 * @param {Function} props.onCancel  - User chose to go back and mark symptoms
 * @param {Function} props.onConfirm - User confirmed no symptoms; proceed
 */
export default function EmptyDiagramConfirmModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print-hide backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-diagram-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg mx-4 text-center">
        <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CircleAlert className="w-7 h-7 text-yellow-600" />
        </div>
        <h2
          id="empty-diagram-title"
          className="text-xl font-bold text-gray-800 mb-3"
        >
          No symptoms marked
        </h2>
        <p className="text-gray-500 text-lg mb-8">
          You haven&apos;t marked any areas on the hand diagrams. If you don&apos;t
          experience any of these symptoms, you can continue. Otherwise, go
          back and mark the affected areas first.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-xl text-lg font-semibold hover:bg-purple-700 transition-colors border-2 border-transparent hover:border-purple-800"
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-purple-300"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}