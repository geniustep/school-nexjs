import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiMeta } from '@/types/api';
import type { StudentSearchHit, StudentSearchResponseMeta } from '@/types/student-search';

export const STUDENT_SEARCH_MIN_QUERY_LENGTH = 2;
export const STUDENT_SEARCH_DEBOUNCE_MS = 400;
export const STUDENT_SEARCH_PAGE = 1;
export const STUDENT_SEARCH_PAGE_SIZE = 10;

export function shouldFetchStudentSearch(query: string): boolean {
  return query.length >= STUDENT_SEARCH_MIN_QUERY_LENGTH;
}

export function buildStudentSearchQueryParams(
  query: string,
  activeSchoolId: number | null | undefined,
) {
  return {
    search: query,
    page: STUDENT_SEARCH_PAGE,
    page_size: STUDENT_SEARCH_PAGE_SIZE,
    active_school_id: activeSchoolId ?? undefined,
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
    endpoints.admin.students,
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
