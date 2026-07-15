/**
 * Pure helpers for synchronized horizontal Kanban scrolling.
 * Scroller DOM uses `direction: ltr`; RTL board uses row-reverse + start at max scroll.
 *
 * UI ratio: 0 = pipeline start, 1 = pipeline end.
 * Physical track: LTR left→right; RTL mirrors so start sits on the right (matches row-reverse).
 */

export type HorizontalScrollMetrics = {
  /** Progress from pipeline start → end (0–1). */
  ratio: number;
  /** Raw scrollLeft / max (LTR scroller space). */
  scrollRatio: number;
  /** Physical left offset of the thumb along the track (0–1 of travel). */
  thumbInset: number;
  thumbRatio: number;
  overflow: boolean;
  canScrollBack: boolean;
  canScrollForward: boolean;
  max: number;
};

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** UI ratio (pipeline start=0) ↔ LTR scrollLeft ratio. */
export function uiRatioFromScrollRatio(scrollRatio: number, dir: 'rtl' | 'ltr'): number {
  const sr = clamp01(scrollRatio);
  return dir === 'rtl' ? 1 - sr : sr;
}

export function scrollRatioFromUiRatio(uiRatio: number, dir: 'rtl' | 'ltr'): number {
  const ur = clamp01(uiRatio);
  return dir === 'rtl' ? 1 - ur : ur;
}

/** Pipeline start is physically on the right in RTL (matches row-reverse board). */
export function thumbInsetFromUiRatio(uiRatio: number, dir: 'rtl' | 'ltr'): number {
  const ur = clamp01(uiRatio);
  return dir === 'rtl' ? 1 - ur : ur;
}

export function uiRatioFromThumbInset(thumbInset: number, dir: 'rtl' | 'ltr'): number {
  const inset = clamp01(thumbInset);
  return dir === 'rtl' ? 1 - inset : inset;
}

export function computeHorizontalScrollMetrics(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  dir: 'rtl' | 'ltr' = 'ltr',
): HorizontalScrollMetrics {
  const max = Math.max(0, scrollWidth - clientWidth);
  const overflow = max > 2;
  const scrollRatio = max > 0 ? clamp01(scrollLeft / max) : 0;
  const ratio = uiRatioFromScrollRatio(scrollRatio, dir);
  const thumbInset = thumbInsetFromUiRatio(ratio, dir);
  const thumbRatio = overflow
    ? Math.max(0.14, Math.min(1, clientWidth / Math.max(scrollWidth, 1)))
    : 1;

  const canScrollBack = dir === 'rtl' ? scrollLeft < max - 2 : scrollLeft > 2;
  const canScrollForward = dir === 'rtl' ? scrollLeft > 2 : scrollLeft < max - 2;

  return {
    ratio,
    scrollRatio,
    thumbInset,
    thumbRatio,
    overflow,
    canScrollBack,
    canScrollForward,
    max,
  };
}

/** Map a pipeline UI ratio onto scrollLeft for the LTR scroller. */
export function scrollLeftFromRatio(
  max: number,
  ratio: number,
  dir: 'rtl' | 'ltr' = 'ltr',
): number {
  return max * scrollRatioFromUiRatio(ratio, dir);
}

/**
 * Map a physical click on the track (0=left, 1=right) onto scrollLeft.
 */
export function scrollLeftFromPhysicalRatio(
  max: number,
  physicalRatio: number,
  dir: 'rtl' | 'ltr' = 'ltr',
): number {
  return scrollLeftFromRatio(max, uiRatioFromThumbInset(physicalRatio, dir), dir);
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

/** Pixel delta on the track → new scrollLeft (thumb drag). */
export function scrollLeftAfterThumbDrag(input: {
  startScroll: number;
  deltaX: number;
  travel: number;
  max: number;
  dir: 'rtl' | 'ltr';
}): number {
  const { startScroll, deltaX, travel, max, dir } = input;
  if (travel <= 0 || max <= 0) return startScroll;
  const startUi = uiRatioFromScrollRatio(startScroll / max, dir);
  const startInset = thumbInsetFromUiRatio(startUi, dir);
  // Finger right increases physical inset; RTL mirrors inset → UI.
  const nextInset = clamp01(startInset + deltaX / travel);
  return scrollLeftFromRatio(max, uiRatioFromThumbInset(nextInset, dir), dir);
}
