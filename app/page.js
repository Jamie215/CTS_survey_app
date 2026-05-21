"use client"

import { useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import ConsentGate from '../components/ConsentGate';
import CTSSurvey from '../components/CTSSurvey';
import { useConsent } from '../hooks/useConsent';

export default function Home() {
  const consent = useConsent();
  const [declined, setDeclined] = useState(false);

  return (
    <ErrorBoundary>
      <ConsentGate
        consent={consent}
        declined={declined}
        onDecline={() => setDeclined(true)}
      >
        <CTSSurvey consent={consent} />
      </ConsentGate>
    </ErrorBoundary>
  );
}