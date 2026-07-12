/**
 * Pure helpers for synchronized horizontal Kanban scrolling.
 * Keeps RTL/LTR ratio math testable without DOM.
 */

export type HorizontalScrollMetrics = {
  ratio: number;
  thumbRatio: number;
  overflow: boolean;
  canScrollBack: boolean;
  canScrollForward: boolean;
  max: number;
};

export function computeHorizontalScrollMetrics(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): HorizontalScrollMetrics {
  const max = Math.max(0, scrollWidth - clientWidth);
  const overflow = max > 2;
  const ratio = max > 0 ? clamp01(scrollLeft / max) : 0;
  const thumbRatio = overflow
    ? Math.max(0.14, Math.min(1, clientWidth / Math.max(scrollWidth, 1)))
    : 1;
  return {
    ratio,
    thumbRatio,
    overflow,
    canScrollBack: scrollLeft < max - 2,
    canScrollForward: scrollLeft > 2,
    max,
  };
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Map a track click/drag ratio (0–1, physical LTR) onto scrollLeft. */
export function scrollLeftFromRatio(max: number, ratio: number): number {
  return max * clamp01(ratio);
}

/**
 * Sync follower scrollLeft from a leader without feedback loops.
 * Returns null when the delta is negligible (caller should skip write).
 */
export function nextSyncedScrollLeft(
  leaderScrollLeft: number,
  followerScrollLeft: number,
  epsilon = 1,
): number | null {
  if (Math.abs(leaderScrollLeft - followerScrollLeft) <= epsilon) return null;
  return leaderScrollLeft;
}

export function boardStartScrollLeft(
  scrollWidth: number,
  clientWidth: number,
  dir: 'rtl' | 'ltr',
): number {
  const max = Math.max(0, scrollWidth - clientWidth);
  return dir === 'rtl' ? max : 0;
}
