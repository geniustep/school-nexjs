/**
 * Distinguish no-active-plan / zero-progress / completed without Backend changes.
 * Backend may return suggestion_reason=plan_completed when there is no distribution.
 */

import type { TeachingProgressSummary } from '@/types/teaching-delivery';

export type CurriculumPlanState =
  | 'no_active_plan'
  | 'active_plan_zero'
  | 'active_progress'
  | 'documentation_gap'
  | 'plan_completed';

export function hasActiveCurriculumPlan(
  summary: TeachingProgressSummary | null | undefined,
): boolean {
  if (!summary) return false;
  const distributionId = summary.context?.annual_distribution_id;
  if (distributionId != null && distributionId > 0) return true;
  const total = summary.total_items ?? summary.line_count ?? summary.planned_lines ?? 0;
  return total > 0;
}

/** Display-only clamp; does not recompute progress. */
export function formatProgressPercentage(
  value: number | null | undefined,
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function resolveCurriculumPlanState(
  summary: TeachingProgressSummary | null | undefined,
): CurriculumPlanState {
  if (!summary || !hasActiveCurriculumPlan(summary)) {
    return 'no_active_plan';
  }

  const remaining = summary.remaining_items ?? 0;
  const percentage =
    summary.progress_percentage ?? summary.coverage_percent ?? 0;
  const undocumented = summary.undocumented_past_sessions ?? 0;
  const completedLike =
    summary.suggestion_reason === 'plan_completed' || remaining === 0;

  if (completedLike && remaining === 0) {
    return 'plan_completed';
  }
  if (undocumented > 0 && percentage === 0 && remaining > 0) {
    return 'documentation_gap';
  }
  if (percentage === 0 && remaining > 0) {
    return 'active_plan_zero';
  }
  if (undocumented > 0) {
    return 'documentation_gap';
  }
  return 'active_progress';
}

export function displayProgressPercentage(
  summary: TeachingProgressSummary | null | undefined,
): number | null {
  return formatProgressPercentage(
    summary?.progress_percentage ?? summary?.coverage_percent ?? null,
  );
}
