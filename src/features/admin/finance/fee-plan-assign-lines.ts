import { normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';
import {
  partitionFeePlanLines,
  planHasNoAssignableLines,
  planLinesContractInvalid,
} from './fee-plan-assign-utils';
import type { FeePlan } from '@/types/finance';

/** True when list payload already includes normalized assignable lines. */
export function planListHasAssignableLines(plan: FeePlan | undefined | null): boolean {
  if (!plan?.lines?.length) return false;
  if (planLinesContractInvalid(plan)) return false;
  return !planHasNoAssignableLines(plan);
}

/** Fetch plan detail when the list item lacks assignable lines. */
export function needsFeePlanDetailFetch(plan: FeePlan | undefined | null): boolean {
  if (!plan) return false;
  return !planListHasAssignableLines(plan);
}

export function mergeFeePlanWithDetailLines(
  listPlan: FeePlan,
  detailPlan: FeePlan | null | undefined,
): FeePlan {
  if (!detailPlan) return listPlan;
  const lines = detailPlan.lines?.length
    ? normalizeFeePlanLines(detailPlan.lines)
    : normalizeFeePlanLines(detailPlan.lines ?? []);
  return {
    ...listPlan,
    ...detailPlan,
    id: listPlan.id,
    lines: lines.length ? lines : detailPlan.lines,
  };
}

export function assignableLineIds(plan: FeePlan | undefined | null): {
  required: number[];
  optional: number[];
} {
  const lines = plan?.lines ?? [];
  const { required, optional } = partitionFeePlanLines(lines);
  return {
    required: required.map((line) => line.id),
    optional: optional.map((line) => line.id),
  };
}
