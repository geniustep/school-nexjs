'use client';

/**
 * Runs `callback` on a fixed interval only while the document is visible.
 * - No tick while `document.hidden` (background / other tab).
 * - One immediate tick when the page becomes visible again.
 * - Skips overlapping ticks while a previous async callback is in flight.
 * - Clears the timer and listeners on unmount or when disabled.
 *
 * Does not run an initial tick; the caller owns first-load UX (e.g. scroll).
 */

import { useEffect, useRef } from 'react';

export function useVisibleInterval(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0 || typeof document === 'undefined') {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    async function runTick() {
      if (cancelled || document.hidden || inFlight) return;
      inFlight = true;
      try {
        await callbackRef.current();
      } finally {
        inFlight = false;
      }
    }

    function clearTimer() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function startTimer() {
      if (timer != null || cancelled) return;
      timer = setInterval(() => {
        void runTick();
      }, intervalMs);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        clearTimer();
        return;
      }
      void runTick();
      startTimer();
    }

    if (!document.hidden) {
      startTimer();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
