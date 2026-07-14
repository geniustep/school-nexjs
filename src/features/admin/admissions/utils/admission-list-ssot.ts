import type { ListParams } from '@/types/api';
import {
  buildAdmissionListServerQuery,
  buildContextQuery,
  buildRegisteredVisibilityQuery,
  type AdmissionWorkspaceListState,
} from './admission-workspace';

/**
 * Stable JSON query key for admissions list/dashboard fetches.
 * Keys are sorted so equal filter sets share one key; differing filters never collide.
 */
export function buildAdmissionsResourceQueryKey(query: ListParams | Record<string, unknown>): string {
  const entries = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of entries) normalized[k] = v;
  return JSON.stringify(normalized);
}

/** Full list query (workspace/status + context + page) used by the table view. */
export function buildAdmissionsListQueryKey(
  state: AdmissionWorkspaceListState,
  options?: { pageSize?: number; activeSchoolId?: number | null },
): string {
  const query: Record<string, unknown> = {
    ...buildAdmissionListServerQuery(state),
    page_size: options?.pageSize ?? 25,
  };
  if (options?.activeSchoolId != null) {
    query.active_school_id = options.activeSchoolId;
  }
  return buildAdmissionsResourceQueryKey(query);
}

/**
 * Dashboard shares academic / search / source / hide_registered context with the
 * list so workspace KPI tallies match List totals (e.g. post_acceptance 14 vs 32).
 * Does not send application_status / workspace (dashboard is tally, not list).
 */
export function buildAdmissionsDashboardQuery(
  state: AdmissionWorkspaceListState,
): ListParams {
  return {
    ...buildContextQuery(state),
    ...buildRegisteredVisibilityQuery(state),
  } as ListParams;
}

export function buildAdmissionsDashboardQueryKey(
  state: AdmissionWorkspaceListState,
  options?: { activeSchoolId?: number | null },
): string {
  const query: Record<string, unknown> = { ...buildAdmissionsDashboardQuery(state) };
  if (options?.activeSchoolId != null) {
    query.active_school_id = options.activeSchoolId;
  }
  return buildAdmissionsResourceQueryKey(query);
}

/**
 * Gate: do not fire list/dashboard until school session is usable.
 * URL filters are derived synchronously from searchParams on init (no second
 * default→URL hydration fetch).
 */
export function areAdmissionsFiltersReady(options: {
  switching: boolean;
  requiresActiveSchool: boolean;
  activeSchoolId: number | null | undefined;
  allowedSchoolIds: number[];
}): boolean {
  if (options.switching) return false;
  if (!options.requiresActiveSchool) return true;
  const id = options.activeSchoolId;
  if (id == null) return false;
  return options.allowedSchoolIds.includes(id);
}
