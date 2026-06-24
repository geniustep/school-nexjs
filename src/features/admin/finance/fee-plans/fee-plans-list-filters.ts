import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';
import type { FeePlanFiltersState } from './fee-plans-filters';
import {
  normalizeFeePlanLevelIds,
  type FeePlanScopeCycleGroup,
} from './fee-plan-level-scope';

export const FEE_PLANS_LIST_PAGE_SIZE = 20;
/** Fetch window for client-side filters — API ignores `search` and has no cycle filter. */
export const FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE = 100;

export function feePlansListUsesClientFilter(
  filters: Pick<FeePlanFiltersState, 'search' | 'cycleId'>,
): boolean {
  return Boolean(filters.search.trim() || filters.cycleId);
}

/** @deprecated Use feePlansListUsesClientFilter */
export function feePlansListUsesClientSearch(
  filters: Pick<FeePlanFiltersState, 'search'>,
): boolean {
  return feePlansListUsesClientFilter({ search: filters.search, cycleId: '' });
}

export function feePlanMatchesCycle(
  plan: FeePlan,
  cycleId: string | undefined,
  scopeGroups: FeePlanScopeCycleGroup[],
): boolean {
  if (!cycleId?.trim()) return true;
  const cycleNum = Number(cycleId);
  if (!Number.isFinite(cycleNum)) return true;
  const group = scopeGroups.find((g) => g.cycle.id === cycleNum);
  if (!group?.levels.length) return true;

  const cycleLevelIds = new Set(group.levels.map((level) => level.schoolLevelId));
  const planLevelIds = normalizeFeePlanLevelIds(plan);
  if (!planLevelIds.length) return true;
  return planLevelIds.some((id) => cycleLevelIds.has(id));
}

export function matchesFeePlanWorkspaceSearch(plan: FeePlan, rawSearch: string): boolean {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;
  const haystack = [plan.name, plan.code]
    .filter((value) => value != null && String(value).trim() !== '')
    .map((value) => String(value).toLowerCase());
  return haystack.some((value) => value.includes(search));
}

export function filterFeePlansWorkspaceRows(
  plans: FeePlan[],
  filters: Pick<FeePlanFiltersState, 'search' | 'stateFilter' | 'cycleId'>,
  scopeGroups: FeePlanScopeCycleGroup[] = [],
): FeePlan[] {
  const search = filters.search.trim();
  return plans.filter((plan) => {
    if (!filters.stateFilter && feePlanState(plan) === 'archived') return false;
    if (search && !matchesFeePlanWorkspaceSearch(plan, search)) return false;
    if (!feePlanMatchesCycle(plan, filters.cycleId, scopeGroups)) return false;
    return true;
  });
}

export function paginateFeePlansClient<T>(
  rows: T[],
  page: number,
  pageSize = FEE_PLANS_LIST_PAGE_SIZE,
): { rows: T[]; pagination: { page: number; total_pages: number; total: number } } {
  const total = rows.length;
  const total_pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), total_pages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pagination: { page: safePage, total_pages, total },
  };
}
