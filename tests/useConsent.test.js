// tests/useConsent.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConsent } from '../hooks/useConsent';
import { CONSENT_VERSION } from '../data/constants';

describe('useConsent', () => {
  it('starts unacknowledged with no sharing and no timestamp', () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current.acknowledged).toBe(false);
    expect(result.current.dataSharing).toBe(false);
    expect(result.current.acknowledgedAt).toBeNull();
    expect(result.current.version).toBe(CONSENT_VERSION);
  });

  it('grantConsent sets acknowledged, dataSharing, and a timestamp', () => {
    const { result } = renderHook(() => useConsent());
    const before = Date.now();
    act(() => {
      result.current.grantConsent({ shareData: true });
    });
    const after = Date.now();

    expect(result.current.acknowledged).toBe(true);
    expect(result.current.dataSharing).toBe(true);

    const ts = new Date(result.current.acknowledgedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('grantConsent with shareData=false acknowledges without sharing', () => {
    const { result } = renderHook(() => useConsent());
    act(() => {
      result.current.grantConsent({ shareData: false });
    });
    expect(result.current.acknowledged).toBe(true);
    expect(result.current.dataSharing).toBe(false);
    expect(result.current.acknowledgedAt).not.toBeNull();
  });

  it('coerces truthy/falsy shareData to a boolean', () => {
    // grantConsent uses !!shareData; record that contract.
    const { result } = renderHook(() => useConsent());
    act(() => {
      result.current.grantConsent({ shareData: 'yes' });
    });
    expect(result.current.dataSharing).toBe(true);
  });

  it('updateDataSharing flips the preference without re-acknowledging', () => {
    const { result } = renderHook(() => useConsent());
    act(() => {
      result.current.grantConsent({ shareData: false });
    });
    const originalTimestamp = result.current.acknowledgedAt;

    act(() => {
      result.current.updateDataSharing(true);
    });

    expect(result.current.dataSharing).toBe(true);
    // Critically: the original acknowledgment timestamp is preserved.
    // Re-stamping it would misrepresent when the user agreed.
    expect(result.current.acknowledgedAt).toBe(originalTimestamp);
  });

  it('updateDataSharing also coerces to boolean', () => {
    const { result } = renderHook(() => useConsent());
    act(() => {
      result.current.updateDataSharing(0);
    });
    expect(result.current.dataSharing).toBe(false);
  });
});