'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  boardStartScrollLeft,
  computeHorizontalScrollMetrics,
  scrollLeftFromRatio,
  type HorizontalScrollMetrics,
} from '../utils/synchronized-horizontal-scroll';

const DEFAULT_STEP = 300;

const INITIAL_METRICS: HorizontalScrollMetrics = {
  ratio: 0,
  thumbRatio: 1,
  overflow: false,
  canScrollBack: false,
  canScrollForward: false,
  max: 0,
};

/**
 * Single content scroller + dual custom rails (top/bottom) kept in sync.
 * Does not invent a second native scrollbar; rails drive the same element.
 */
export function useSynchronizedHorizontalScroll(options: {
  dir: 'rtl' | 'ltr';
  /** Reset to pipeline start only when this key changes (not on every refetch). */
  resetKey: string;
  step?: number;
}) {
  const { dir, resetKey, step = DEFAULT_STEP } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbDragRef = useRef<{ startX: number; startScroll: number } | null>(null);
  const syncingRef = useRef(false);
  const [metrics, setMetrics] = useState<HorizontalScrollMetrics>(INITIAL_METRICS);

  const syncScrollUi = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMetrics(
      computeHorizontalScrollMetrics(el.scrollLeft, el.scrollWidth, el.clientWidth),
    );
  }, []);

  const scrollTowardPipelineStart = useCallback(() => {
    scrollRef.current?.scrollBy({ left: step, behavior: 'smooth' });
  }, [step]);

  const scrollTowardPipelineEnd = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -step, behavior: 'smooth' });
  }, [step]);

  const setScrollRatio = useCallback((ratio: number) => {
    const el = scrollRef.current;
    if (!el || syncingRef.current) return;
    syncingRef.current = true;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = scrollLeftFromRatio(max, ratio);
    requestAnimationFrame(() => {
      syncingRef.current = false;
      syncScrollUi();
    });
  }, [syncScrollUi]);

  const navigateRail = useCallback(
    (clientX: number, track: HTMLElement) => {
      const rect = track.getBoundingClientRect();
      const relative = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setScrollRatio(relative);
    },
    [setScrollRatio],
  );

  const onThumbPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    thumbDragRef.current = { startX: event.clientX, startScroll: el.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onThumbPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = thumbDragRef.current;
      const el = scrollRef.current;
      const track = event.currentTarget.parentElement;
      if (!drag || !el || !track) return;

      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const travel = track.clientWidth * Math.max(0, 1 - metrics.thumbRatio);
      if (travel <= 0) return;

      const deltaX = event.clientX - drag.startX;
      el.scrollLeft = Math.max(0, Math.min(max, drag.startScroll + (deltaX / travel) * max));
    },
    [metrics.thumbRatio],
  );

  const onThumbPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    thumbDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const resetScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = boardStartScrollLeft(el.scrollWidth, el.clientWidth, dir);
    requestAnimationFrame(syncScrollUi);
  }, [dir, syncScrollUi]);

  useEffect(() => {
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(resetScrollPosition);
    });
    return () => cancelAnimationFrame(outer);
  }, [resetKey, dir, resetScrollPosition]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (syncingRef.current) return;
      syncScrollUi();
    };
    const ro = new ResizeObserver(() => syncScrollUi());

    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    syncScrollUi();

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [dir, resetKey, syncScrollUi]);

  return {
    scrollRef,
    metrics,
    syncScrollUi,
    scrollTowardPipelineStart,
    scrollTowardPipelineEnd,
    setScrollRatio,
    navigateRail,
    onThumbPointerDown,
    onThumbPointerMove,
    onThumbPointerUp,
  };
}
