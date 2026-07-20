import type { TeacherSummary } from '@/types/teacher-domain';
import { hasAllowedAction } from './teacher-domain-allowed-actions';

export const TEACHER_DOMAIN_PAGE_SIZE = 20;
/** Fetch window used when applying client-side list filters (Backend ignores those params today). */
export const TEACHER_DOMAIN_FILTER_FETCH_SIZE = 200;
export const TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS = 400;

export type TeacherListClientFilters = {
  state?: string;
  active?: string;
  hasAssignments?: string;
};

export function teacherHasActiveAssignments(
  teacher: Pick<TeacherSummary, 'assignment_summary'>,
): boolean {
  const summary = teacher.assignment_summary;
  const count =
    summary?.operational_count ?? summary?.active_count ?? summary?.total_count ?? 0;
  return Number(count) > 0;
}

/**
 * Client-side teacher list filters.
 * Live Backend currently honors `search` only; `state` / `active` / `has_assignments`
 * are applied here so the UI matches user intent on the fetched window.
 */
export function matchesTeacherListFilters(
  teacher: TeacherSummary,
  filters: TeacherListClientFilters,
): boolean {
  if (filters.state && teacherEmploymentState(teacher) !== filters.state) return false;

  if (filters.active === 'true' && teacher.active !== true) return false;
  if (filters.active === 'false' && teacher.active !== false) return false;

  if (filters.hasAssignments === 'true' && !teacherHasActiveAssignments(teacher)) {
    return false;
  }
  if (filters.hasAssignments === 'false' && teacherHasActiveAssignments(teacher)) {
    return false;
  }

  return true;
}

export function filterTeacherSummaries(
  teachers: TeacherSummary[],
  filters: TeacherListClientFilters,
): TeacherSummary[] {
  if (!filters.state && !filters.active && !filters.hasAssignments) return teachers;
  return teachers.filter((teacher) => matchesTeacherListFilters(teacher, filters));
}

export function paginateTeacherSummaries(
  teachers: TeacherSummary[],
  page: number,
  pageSize: number = TEACHER_DOMAIN_PAGE_SIZE,
): TeacherSummary[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return teachers.slice(start, start + pageSize);
}

export function teacherDisplayName(teacher: Pick<TeacherSummary, 'name' | 'identity'>): string {
  return teacher.identity?.display_name?.trim() || teacher.name || '';
}

export function teacherInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function teacherAccountStateLabelKey(
  teacher: Pick<TeacherSummary, 'account' | 'active'>,
): string {
  const account = teacher.account as {
    user_active?: boolean;
    has_linked_user?: boolean;
    status?: string;
    user_id?: number | null;
  } | null;
  if (!account || (account.has_linked_user === false && account.user_id == null)) {
    return 'admin.teacherDomain.account.none';
  }
  if (account.user_active === false || account.status === 'inactive') {
    return 'admin.teacherDomain.account.inactive';
  }
  return 'admin.teacherDomain.account.active';
}

export function teacherEmploymentState(
  teacher: Pick<TeacherSummary, 'employment' | 'status' | 'active'>,
): string {
  return teacher.employment?.state || teacher.status || (teacher.active ? 'active' : 'inactive');
}

export function teacherWarningCount(teacher: Pick<TeacherSummary, 'warnings'>): number {
  return Array.isArray(teacher.warnings) ? teacher.warnings.length : 0;
}

export function teacherListIsLightweight(teacher: TeacherSummary): boolean {
  // List must not require nested assignment detail rows.
  const assignments = (teacher as { assignments?: unknown[] }).assignments;
  if (!Array.isArray(assignments) || assignments.length === 0) return true;
  const first = assignments[0];
  return !(first != null && typeof first === 'object' && 'class' in first);
}

export function resolveTeacherListEmptyVariant(params: {
  total: number | null | undefined;
  hasActiveFilters: boolean;
}): 'empty' | 'noMatch' {
  if ((params.total ?? 0) === 0 && params.hasActiveFilters) return 'noMatch';
  return 'empty';
}

export function teacherPrimaryActions(
  teacher: Pick<TeacherSummary, 'allowed_actions'>,
): Array<'edit' | 'terminate' | 'archive' | 'reactivate'> {
  const order = ['edit', 'terminate', 'archive', 'reactivate'] as const;
  return order.filter((action) => hasAllowedAction(teacher.allowed_actions, action));
}

export function formatPlannedLoad(
  value: number | null | undefined,
  fallback: string,
): string {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return String(value);
}
