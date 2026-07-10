import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiMeta } from '@/types/api';
import type { StudentSearchHit, StudentSearchResponseMeta } from '@/types/student-search';

/**
 * Shared GET /admin/students search contract (Odoo).
 * One student search engine — multiple UX surfaces (Spotlight, Students list, future pickers).
 * @see docs/design/RAQEEM-DESIGN.md
 */

export const STUDENT_SEARCH_MIN_QUERY_LENGTH = 2;
export const STUDENT_SEARCH_DEBOUNCE_MS = 400;
export const STUDENT_SEARCH_PAGE = 1;
export const STUDENT_SEARCH_PAGE_SIZE = 10;
export const STUDENT_LIST_PAGE_SIZE = 20;

export const ADMIN_STUDENTS_SEARCH_PATH = endpoints.admin.students;

export type StudentsListSearchFilters = {
  search: string;
  classId: string;
  levelId: string;
  statusFilter: string;
  accountFilter: string;
  page: number;
};

export function normalizeStudentSearchQuery(raw: string): string {
  return raw.trim();
}

export function shouldFetchStudentSearch(query: string): boolean {
  return normalizeStudentSearchQuery(query).length >= STUDENT_SEARCH_MIN_QUERY_LENGTH;
}

export function buildStudentSearchQueryParams(
  query: string,
  activeSchoolId: number | null | undefined,
) {
  return {
    search: normalizeStudentSearchQuery(query),
    page: STUDENT_SEARCH_PAGE,
    page_size: STUDENT_SEARCH_PAGE_SIZE,
    active_school_id: activeSchoolId ?? undefined,
  };
}

/** List surface: same `search` semantics as Spotlight, plus structured filters + pagination. */
export function buildStudentsListQueryParams(
  filters: StudentsListSearchFilters,
): {
  page: number;
  page_size: number;
  search?: string;
  class_id?: string;
  level_id?: string;
  status?: string;
  has_account?: string;
  account_status?: string;
} {
  const search = normalizeStudentSearchQuery(filters.search);
  const accountFilter = filters.accountFilter;

  return {
    page: filters.page,
    page_size: STUDENT_LIST_PAGE_SIZE,
    search: search || undefined,
    class_id: filters.classId || undefined,
    level_id: filters.levelId || undefined,
    status: filters.statusFilter || undefined,
    has_account:
      accountFilter === 'has_account'
        ? 'true'
        : accountFilter === 'no_account'
          ? 'false'
          : undefined,
    account_status: accountFilter === 'inactive_account' ? 'inactive' : undefined,
  };
}

export type StudentSearchFetchResult = {
  results: StudentSearchHit[];
  suggestion: string | null;
};

export function parseStudentSearchSuggestion(meta: ApiMeta | undefined): string | null {
  const didYouMean = meta?.did_you_mean as StudentSearchResponseMeta['did_you_mean'];
  if (didYouMean == null) return null;
  const query = didYouMean.query;
  return typeof query === 'string' && query.length > 0 ? query : null;
}

export async function fetchStudentSearchHits(
  query: string,
  activeSchoolId: number | null | undefined,
): Promise<StudentSearchFetchResult> {
  const res = await api.get<StudentSearchHit[]>(
    ADMIN_STUDENTS_SEARCH_PATH,
    buildStudentSearchQueryParams(query, activeSchoolId),
  );
  if (!res.success) {
    throw new Error(res.error?.message ?? 'student_search_failed');
  }
  return {
    results: Array.isArray(res.data) ? res.data : [],
    suggestion: parseStudentSearchSuggestion(res.meta),
  };
}

export type StudentSearchQueryOutcome =
  | { kind: 'success'; results: StudentSearchHit[]; suggestion: string | null }
  | { kind: 'error' }
  | { kind: 'stale' };

export async function executeStudentSearchQuery(
  query: string,
  activeSchoolId: number | null | undefined,
  seq: number,
  getCurrentSeq: () => number,
): Promise<StudentSearchQueryOutcome> {
  try {
    const { results, suggestion } = await fetchStudentSearchHits(query, activeSchoolId);
    if (seq !== getCurrentSeq()) return { kind: 'stale' };
    return { kind: 'success', results, suggestion };
  } catch {
    if (seq !== getCurrentSeq()) return { kind: 'stale' };
    return { kind: 'error' };
  }
}
