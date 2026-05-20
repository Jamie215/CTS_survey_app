"use client"

import React from 'react';
import { CircleAlert } from 'lucide-react';

/**
 * Page-level error boundary for the CTS survey.
 *
 * Catches render-phase, lifecycle, and constructor errors anywhere in
 * the tree below it and shows a non-alarming fallback. Does NOT catch:
 *   - Errors thrown inside event handlers
 *   - Async errors (promise rejections, setTimeout callbacks)
 *   - SSR errors (irrelevant here — CTSSurvey is a client component)
 *
 * Recovery is a full page reload rather than resetting boundary state,
 * because (a) it guarantees a clean slate for canvas refs, tour state,
 * and any module-level state, and (b) a deterministic bug would
 * otherwise loop the user back into the same crash.
 *
 * TODO (#7): once sessionStorage persistence lands, check for
 * in-progress data on mount of the fallback and offer "Resume" instead
 * of (or alongside) "Reload". Update the user-facing copy at the same
 * time — currently it tells the user their responses were lost, which
 * will no longer be strictly true.
 *
 * Future hook point: componentDidCatch is the place to wire up remote
 * error logging (e.g. Sentry) if the PI ever wants production
 * telemetry. Intentionally left as console.error for now.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CTS survey caught an unexpected error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 max-w-lg w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CircleAlert className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Something went wrong
          </h2>
          <p className="text-gray-600 text-lg mb-4">
            The assessment ran into an unexpected error and can&apos;t continue.
          </p>
          <p className="text-gray-500 text-base mb-8">
            Any responses entered during this session have not been saved.
            Please reload the page to start again.
          </p>

          {isDev && this.state.error && (
            <details className="text-left bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error details (development only)
              </summary>
              <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}