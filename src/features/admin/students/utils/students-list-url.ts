import {
  buildStudentsListQueryParams,
  type StudentsListSearchFilters,
} from './student-search-query';

type StudentsListRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export type StudentsListFilterValues = {
  search: string;
  cycleCode: string;
  levelId: string;
  classId: string;
  statusFilter: string;
  accountFilter: string;
  page: number;
};

export const STUDENTS_LIST_DEFAULT_FILTERS: StudentsListFilterValues = {
  search: '',
  cycleCode: '',
  levelId: '',
  classId: '',
  statusFilter: '',
  accountFilter: '',
  page: 1,
};

const VALID_STATUS_FILTERS = new Set(['', 'active', 'suspended']);
const VALID_ACCOUNT_FILTERS = new Set([
  '',
  'has_account',
  'no_account',
  'inactive_account',
]);

function parsePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export function parseStudentsListUrl(searchParams: URLSearchParams): StudentsListFilterValues {
  const statusRaw = searchParams.get('status') ?? '';
  const accountRaw = searchParams.get('account') ?? '';

  return {
    search: searchParams.get('search')?.trim() ?? '',
    cycleCode: searchParams.get('cycle')?.trim() ?? '',
    levelId: searchParams.get('level')?.trim() ?? '',
    classId: searchParams.get('class')?.trim() ?? '',
    statusFilter: VALID_STATUS_FILTERS.has(statusRaw) ? statusRaw : '',
    accountFilter: VALID_ACCOUNT_FILTERS.has(accountRaw) ? accountRaw : '',
    page: parsePage(searchParams.get('page')),
  };
}

export function buildStudentsListSearchParams(state: StudentsListFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  const search = state.search.trim();

  if (search) params.set('search', search);
  if (state.cycleCode) params.set('cycle', state.cycleCode);
  if (state.levelId) params.set('level', state.levelId);
  if (state.classId) params.set('class', state.classId);
  if (state.statusFilter) params.set('status', state.statusFilter);
  if (state.accountFilter) params.set('account', state.accountFilter);
  if (state.page > 1) params.set('page', String(state.page));

  return params;
}

export function serializeStudentsListUrl(state: StudentsListFilterValues): string {
  return buildStudentsListSearchParams(state).toString();
}

export function replaceStudentsListUrl(
  router: StudentsListRouter,
  pathname: string,
  currentParams: URLSearchParams,
  nextState: StudentsListFilterValues,
): void {
  const nextQs = serializeStudentsListUrl(nextState);
  const currentQs = currentParams.toString();
  if (nextQs === currentQs) return;
  router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
}

export function studentsListHasActiveQuery(state: Pick<
  StudentsListFilterValues,
  'search' | 'cycleCode' | 'levelId' | 'classId' | 'statusFilter' | 'accountFilter'
>): boolean {
  return !!(
    state.search.trim() ||
    state.cycleCode ||
    state.levelId ||
    state.classId ||
    state.statusFilter ||
    state.accountFilter
  );
}

/**
 * Maps list URL state to GET /admin/students query params.
 * `cycleCode` is intentionally omitted: the API ignores cycle* and only
 * accepts `level_id`. Cycle-only filtering is handled client-side by
 * expanding to the cycle's levels (see students-list-cycle-filter).
 */
export function studentsListToApiParams(state: StudentsListFilterValues) {
  const filters: StudentsListSearchFilters = {
    search: state.search,
    classId: state.classId,
    levelId: state.levelId,
    statusFilter: state.statusFilter,
    accountFilter: state.accountFilter,
    page: state.page,
  };
  return buildStudentsListQueryParams(filters);
}
