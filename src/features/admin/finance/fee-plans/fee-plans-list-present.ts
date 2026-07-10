/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation helpers for Fee Plans list/workspace chrome.
 * Does not change lifecycle, assignment, or pricing semantics.
 */

import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';
import type { FeePlanFiltersState } from '@/features/admin/finance/fee-plans/fee-plans-filters';
import {
  FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE,
  FEE_PLANS_LIST_PAGE_SIZE,
  feePlansListUsesClientFilter,
} from '@/features/admin/finance/fee-plans/fee-plans-list-filters';

export { FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE, FEE_PLANS_LIST_PAGE_SIZE };

export type FeePlansListEmptyVariant = 'no-data' | 'no-match';

export type FeePlansActiveQueryInput = Pick<
  FeePlanFiltersState,
  'search' | 'yearId' | 'cycleId' | 'levelId' | 'stateFilter'
>;

export function feePlansListHasActiveQuery(options: FeePlansActiveQueryInput): boolean {
  return Boolean(
    options.search?.trim() ||
      options.yearId ||
      options.cycleId ||
      options.levelId ||
      options.stateFilter,
  );
}

export function resolveFeePlansListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): FeePlansListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

/** List presentation only — reuses existing state resolver, no new semantics. */
export function resolveFeePlanListState(plan: FeePlan): string {
  return feePlanState(plan);
}

/**
 * Optional usage count for list rows when the API includes usage on the plan.
 * Returns null when usage is absent — does not invent counts.
 */
export function resolveFeePlanListUsageCount(plan: FeePlan): number | null {
  const usage = plan.usage ?? plan.usage_summary;
  if (!usage) return null;
  const assigned = usage.assigned_student_count ?? usage.student_count;
  if (typeof assigned === 'number' && Number.isFinite(assigned)) return assigned;
  return null;
}

export type FeePlansResultContext = {
  total: number;
  clientWindowActive: boolean;
  clientWindowLimit: number;
  pageSize: number;
};

/**
 * Result context for the workspace list.
 * When search/cycle force the client fetch window, totals reflect the loaded window
 * (up to FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE), not a full server-side search index.
 */
export function resolveFeePlansResultContext(options: {
  filters: Pick<FeePlanFiltersState, 'search' | 'cycleId'>;
  filteredTotal: number;
  serverTotal?: number | null;
}): FeePlansResultContext {
  const clientWindowActive = feePlansListUsesClientFilter(options.filters);
  return {
    total: clientWindowActive
      ? options.filteredTotal
      : (options.serverTotal ?? options.filteredTotal),
    clientWindowActive,
    clientWindowLimit: FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE,
    pageSize: FEE_PLANS_LIST_PAGE_SIZE,
  };
}
