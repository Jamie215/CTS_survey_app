// tests/useIdleTimeout.test.js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

/**
 * Unit tests for useIdleTimeout.
 *
 * The whole hook is a state machine over timers, so vi.useFakeTimers()
 * is the lever — we advance time programmatically and assert what
 * phase the hook is in. Default fake-timers config also mocks Date,
 * which matters because the countdown interval computes remaining
 * seconds from Date.now() rather than a tick counter.
 *
 * `setup()` uses short timings (idleMs=1000, warningMs=500) so the
 * test reads as plain arithmetic — boundary-condition checks at 999
 * vs 1000 also stay readable.
 */

function setup({ idleMs = 1000, warningMs = 500, onTimeout = vi.fn() } = {}) {
  const hook = renderHook(() =>
    useIdleTimeout({ idleMs, warningMs, onTimeout })
  );
  return { ...hook, onTimeout };
}

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in the active phase with the full countdown reserve', () => {
    const { result } = setup({ idleMs: 1000, warningMs: 5000 });
    expect(result.current.showWarning).toBe(false);
    // Initial secondsRemaining is the ceiling of warningMs/1000, even
    // though the countdown hasn't started — so the modal can render a
    // sensible value on first appearance with no flash of zero.
    expect(result.current.secondsRemaining).toBe(5);
  });

  it('does not show the warning until idleMs has elapsed', () => {
    const { result } = setup({ idleMs: 1000, warningMs: 500 });
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current.showWarning).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.showWarning).toBe(true);
  });

  it('fires onTimeout exactly once after the warning window expires', () => {
    const { result, onTimeout } = setup({ idleMs: 1000, warningMs: 500 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.showWarning).toBe(true);
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(500); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('ticks secondsRemaining down during the warning phase', () => {
    const { result } = setup({ idleMs: 1000, warningMs: 3000 });

    // Enter warning phase. Countdown starts at ceil(3000/1000) = 3.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.secondsRemaining).toBe(3);

    // 1s of warning elapsed → remaining = ceil((3000-1000)/1000) = 2.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.secondsRemaining).toBe(2);

    // 2s elapsed → 1.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.secondsRemaining).toBe(1);
  });

  describe('activity in the active phase', () => {
    it('mousedown resets the idle timer', () => {
      const { result } = setup({ idleMs: 1000, warningMs: 500 });

      act(() => { vi.advanceTimersByTime(800); });
      act(() => {
        window.dispatchEvent(new MouseEvent('mousedown'));
      });

      // 800ms more would have crossed the original deadline, but
      // shouldn't cross the reset deadline.
      act(() => { vi.advanceTimersByTime(800); });
      expect(result.current.showWarning).toBe(false);

      // 200ms more crosses the reset deadline.
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current.showWarning).toBe(true);
    });

    it.each(['keydown', 'touchstart', 'pointerdown'])(
      '%s also resets the idle timer',
      (eventType) => {
        const { result } = setup({ idleMs: 1000, warningMs: 500 });

        act(() => { vi.advanceTimersByTime(900); });
        act(() => {
          // Listener only cares about the event name, so a plain
          // Event suffices. (TouchEvent isn't reliably constructable
          // in jsdom.)
          window.dispatchEvent(new Event(eventType));
        });

        act(() => { vi.advanceTimersByTime(900); });
        expect(result.current.showWarning).toBe(false);
      }
    );

    it('does not respond to events outside the listed set', () => {
      // Pinning this so a future change that adds 'mousemove' to the
      // listener set has to consciously update the test — kiosk users
      // brushing the trackpad shouldn't count as engagement.
      const { result } = setup({ idleMs: 1000, warningMs: 500 });

      act(() => { vi.advanceTimersByTime(900); });
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });
      act(() => { vi.advanceTimersByTime(100); });
      expect(result.current.showWarning).toBe(true);
    });
  });

  it('ignores activity events during the warning phase', () => {
    // The kiosk-protection point: a stray mouse jiggle while the
    // warning is up must NOT silently extend the session.
    const { result, onTimeout } = setup({ idleMs: 1000, warningMs: 500 });

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.showWarning).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'));
      window.dispatchEvent(new Event('keydown'));
      window.dispatchEvent(new Event('touchstart'));
    });

    // Warning's still showing; original deadline still applies.
    expect(result.current.showWarning).toBe(true);
    act(() => { vi.advanceTimersByTime(500); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  describe('dismissWarning', () => {
    it('returns the hook to the active phase', () => {
      const { result } = setup({ idleMs: 1000, warningMs: 500 });
      act(() => { vi.advanceTimersByTime(1000); });
      expect(result.current.showWarning).toBe(true);

      act(() => { result.current.dismissWarning(); });
      expect(result.current.showWarning).toBe(false);
    });

    it('cancels the pending onTimeout so it does not fire', () => {
      const { result, onTimeout } = setup({ idleMs: 1000, warningMs: 500 });
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { result.current.dismissWarning(); });

      // Advancing past the original timeout deadline — nothing fires.
      act(() => { vi.advanceTimersByTime(500); });
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('restarts a fresh idle period', () => {
      const { result } = setup({ idleMs: 1000, warningMs: 500 });
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { result.current.dismissWarning(); });

      // Warning should fire again only after a full new idleMs.
      act(() => { vi.advanceTimersByTime(999); });
      expect(result.current.showWarning).toBe(false);
      act(() => { vi.advanceTimersByTime(1); });
      expect(result.current.showWarning).toBe(true);
    });

    it('resets secondsRemaining for the next warning cycle', () => {
      const { result } = setup({ idleMs: 1000, warningMs: 3000 });

      // Enter warning, let it tick down partway.
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.secondsRemaining).toBeLessThan(3);

      // Dismiss → next cycle starts fresh, not partway down.
      act(() => { result.current.dismissWarning(); });
      act(() => { vi.advanceTimersByTime(1000); });
      expect(result.current.showWarning).toBe(true);
      expect(result.current.secondsRemaining).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('cancels timers on unmount', () => {
      const { unmount, onTimeout } = setup({ idleMs: 1000, warningMs: 500 });
      unmount();
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('removes activity listeners on unmount', () => {
      // Hard to assert listener removal directly without inspecting
      // jsdom internals. The observable proxy is: after unmount,
      // dispatching events doesn't throw and doesn't resurrect state.
      const { result, unmount } = setup({ idleMs: 1000, warningMs: 500 });
      unmount();

      expect(() => {
        window.dispatchEvent(new MouseEvent('mousedown'));
        window.dispatchEvent(new Event('keydown'));
      }).not.toThrow();

      // result still reflects the unmounted state — no resurrection.
      expect(result.current.showWarning).toBe(false);
    });
  });
});