import type { HorizontalScrollMetrics } from './synchronized-horizontal-scroll';

/** Avoid React re-renders when scroll UI numbers did not change. */
export function horizontalScrollMetricsEqual(
  a: HorizontalScrollMetrics,
  b: HorizontalScrollMetrics,
): boolean {
  return (
    a.ratio === b.ratio &&
    a.scrollRatio === b.scrollRatio &&
    a.thumbInset === b.thumbInset &&
    a.thumbRatio === b.thumbRatio &&
    a.overflow === b.overflow &&
    a.canScrollBack === b.canScrollBack &&
    a.canScrollForward === b.canScrollForward &&
    a.max === b.max
  );
}
