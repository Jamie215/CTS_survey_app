"use client"

import React, { useEffect, useRef } from 'react';

/**
 * Accessible modal dialog primitive.
 *
 * Behaviour:
 *   - Renders only when `open` is true.
 *   - Focus trap: Tab/Shift+Tab cycle within the modal.
 *   - Initial focus lands on the title container, so screen readers
 *     announce the dialog purpose before the user tabs into controls.
 *     Pass `initialFocusRef` to override.
 *   - Escape calls `onClose`.
 *   - Focus return: on close, restores focus to whatever was focused
 *     when the modal opened, unless that was <body> (no meaningful
 *     opener) — in which case focus is left where the close handler
 *     puts it.
 *   - Backdrop click is opt-in via `closeOnBackdrop` (default false),
 *     since both current usages have consequential choices that
 *     shouldn't be dismissable by accidental clicks.
 *
 * ARIA:
 *   - role="dialog", aria-modal="true"
 *   - aria-labelledby points to `titleId`, which the parent uses on
 *     its title element.
 *
 */
export default function Modal({
  open,
  onClose,
  titleId,
  initialFocusRef,
  closeOnBackdrop = false,
  children,
}) {
  const containerRef = useRef(null);
  const titleAnchorRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Capture the element that had focus when the modal opened, and
  // restore it on close (unless it was <body>, which means there's no
  // meaningful opener — e.g. an auto-opened modal on section mount).
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement;

    // Defer initial focus until after the modal's DOM is in place.
    // requestAnimationFrame is enough; setTimeout(0) also works.
    const raf = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (titleAnchorRef.current) {
        titleAnchorRef.current.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      const prev = previouslyFocusedRef.current;
      if (prev && prev !== document.body && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open, initialFocusRef]);

  // Escape + focus trap, wired only while open.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusables = container.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) {
        // Nothing focusable; pin focus on the title anchor.
        e.preventDefault();
        titleAnchorRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      // Wrap forward/back. Also handles the case where focus is on the
      // title anchor (tabIndex -1, not in the focusables list) — in
      // that case Tab moves to `first`, Shift+Tab to `last`.
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    // Only close if the click was on the backdrop itself, not a
    // descendant that happens to bubble up.
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print-hide backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg mx-4 text-center outline-none"
        tabIndex={-1}
      >
        {/*
          Title anchor. The parent renders its own <h2 id={titleId}>
          inside `children`. We mount a 0-size focusable anchor here so
          initial focus lands at the top of the dialog without
          stealing focus *into* the title's text (which can read
          oddly with some screen readers).
        */}
        <span
          ref={titleAnchorRef}
          tabIndex={-1}
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  );
}