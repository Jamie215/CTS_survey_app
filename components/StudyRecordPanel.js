"use client"

import React, { useState } from 'react';
import { FolderDown, RotateCcw, CircleCheck, CircleAlert } from 'lucide-react';
import { STUDY_TIMEPOINTS } from '../data/constants';
import { validateParticipantId } from '../lib/studyExport';

/**
 * Results-page panel for in-person study sessions (option 1a): the
 * coordinator enters the participant ID and timepoint, saves one ZIP
 * (REDCap import row + the four hand drawings) to the encrypted study
 * drive, then clears the session for the next participant.
 *
 * @param {Object} props
 * @param {Function} props.onSave        ({ participantId, event }) => Promise
 * @param {string} props.status          idle | saving | saved | error
 * @param {string|null} props.savedName  file name of the last save
 */
export default function StudyRecordPanel({ onSave, status, savedName }) {
  const [participantId, setParticipantId] = useState('');
  const [event, setEvent] = useState('');
  const [touched, setTouched] = useState(false);

  const idError = validateParticipantId(participantId);
  const eventError = event ? null : 'Choose the timepoint.';
  const canSave = !idError && !eventError && status !== 'saving';

  const handleSave = () => {
    setTouched(true);
    if (canSave) onSave({ participantId: participantId.trim(), event });
  };

  const handleFinish = () => {
    if (status !== 'saved' &&
        !window.confirm('The study files have not been saved. Start the next participant anyway?')) {
      return;
    }
    window.location.reload();   // same clean reset the idle timeout uses
  };

  return (
    <section className="print-hide mt-8 rounded-xl border border-purple-200 bg-purple-50 p-4 sm:p-6" aria-labelledby="study-record-title">
      <h3 id="study-record-title" className="text-xl font-bold text-gray-800">Save the study record</h3>
      <p className="mt-1 text-gray-600">
        For study staff. Saves the answers (ready to import into REDCap) and the four hand drawings as one ZIP file.
        Save it to the encrypted study drive.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Participant ID</span>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            aria-invalid={touched && !!idError}
            aria-describedby="participant-id-error"
          />
          {touched && idError && (
            <span id="participant-id-error" className="mt-1 block text-sm text-red-700">{idError}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Timepoint</span>
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            aria-invalid={touched && !!eventError}
          >
            <option value="">Select…</option>
            {STUDY_TIMEPOINTS.map((t) => (
              <option key={t.event} value={t.event}>{t.label}</option>
            ))}
          </select>
          {touched && eventError && (
            <span className="mt-1 block text-sm text-red-700">{eventError}</span>
          )}
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="flex items-center gap-2 px-5 py-3 rounded-lg text-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          <FolderDown className="w-5 h-5" />
          {status === 'saving' ? 'Saving…' : 'Save study files (ZIP)'}
        </button>
        <button
          onClick={handleFinish}
          className="flex items-center gap-2 px-5 py-3 rounded-lg text-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Finish and start next participant
        </button>
      </div>

      {status === 'saved' && savedName && (
        <p className="mt-4 flex items-start gap-2 text-green-800" role="status">
          <CircleCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>Saved <strong>{savedName}</strong>. Check it is on the encrypted study drive before finishing.</span>
        </p>
      )}
      {status === 'error' && (
        <p className="mt-4 flex items-start gap-2 text-red-800" role="alert">
          <CircleAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>The files could not be saved. Try again, or use Print Results to keep a paper copy.</span>
        </p>
      )}
    </section>
  );
}
