"use client"

import ErrorBoundary from '../components/ErrorBoundary';
import CTSSurvey from '../components/CTSSurvey';

export default function Home() {
  return (
    <ErrorBoundary>
      <CTSSurvey />
    </ErrorBoundary>
  );
}