import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildStudentSearchQueryParams,
  buildStudentsListQueryParams,
  executeStudentSearchQuery,
  fetchStudentSearchHits,
  normalizeStudentSearchQuery,
  parseStudentSearchSuggestion,
  shouldFetchStudentSearch,
  STUDENT_LIST_PAGE_SIZE,
  STUDENT_SEARCH_MIN_QUERY_LENGTH,
  STUDENT_SEARCH_PAGE,
  STUDENT_SEARCH_PAGE_SIZE,
} from './student-search-query';
import type { StudentSearchHit } from '@/types/student-search';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      students: '/admin/students',
    },
  },
}));

const sampleHit = (partial: Partial<StudentSearchHit> & Pick<StudentSearchHit, 'id'>): StudentSearchHit => ({
  id: partial.id,
  code: partial.code ?? null,
  level: partial.level ?? null,
  class: partial.class ?? null,
  status: partial.status ?? 'active',
  gender: partial.gender ?? null,
  date_of_birth: partial.date_of_birth ?? null,
  admission_date: partial.admission_date ?? null,
  email: partial.email ?? null,
  phone: partial.phone ?? null,
  matched_on: partial.matched_on,
});

describe('shouldFetchStudentSearch', () => {
  it('does not fetch when query is shorter than minimum length', () => {
    expect(STUDENT_SEARCH_MIN_QUERY_LENGTH).toBe(2);
    expect(shouldFetchStudentSearch('')).toBe(false);
    expect(shouldFetchStudentSearch('a')).toBe(false);
  });

  it('allows fetch when query meets minimum length', () => {
    expect(shouldFetchStudentSearch('ab')).toBe(true);
    expect(shouldFetchStudentSearch('عبد')).toBe(true);
  });
});

describe('buildStudentsListQueryParams', () => {
  it('uses the same search param normalization as Spotlight', () => {
    const params = buildStudentsListQueryParams({
      search: '  ali  ',
      classId: '9',
      levelId: '5',
      statusFilter: 'active',
      accountFilter: 'inactive_account',
      page: 2,
    });

    expect(params).toEqual({
      page: 2,
      page_size: STUDENT_LIST_PAGE_SIZE,
      search: 'ali',
      class_id: '9',
      level_id: '5',
      status: 'active',
      has_account: undefined,
      account_status: 'inactive',
      service_id: undefined,
      service_presence: undefined,
    });
    expect(normalizeStudentSearchQuery('  ali  ')).toBe(
      buildStudentSearchQueryParams('  ali  ', 1).search,
    );
  });

  it('serializes active and suspended account filters', () => {
    const base = {
      search: '',
      classId: '',
      levelId: '',
      statusFilter: '',
      page: 1,
    };
    expect(buildStudentsListQueryParams({ ...base, accountFilter: 'active_account' }).account_status)
      .toBe('active');
    expect(buildStudentsListQueryParams({ ...base, accountFilter: 'suspended_account' }).account_status)
      .toBe('suspended');
  });

  it('omits empty search to match list semantics', () => {
    expect(
      buildStudentsListQueryParams({
        search: '',
        classId: '',
        levelId: '',
        statusFilter: '',
        accountFilter: '',
        page: 1,
      }).search,
    ).toBeUndefined();
  });

  it('includes financial service filter contract params', () => {
    expect(
      buildStudentsListQueryParams({
        search: '',
        classId: '',
        levelId: '3',
        statusFilter: '',
        accountFilter: '',
        serviceId: '42',
        servicePresence: 'has',
        page: 1,
      }),
    ).toMatchObject({
      service_id: '42',
      service_presence: 'has',
      level_id: '3',
      page: 1,
    });

    expect(
      buildStudentsListQueryParams({
        search: '',
        classId: '',
        levelId: '',
        statusFilter: '',
        accountFilter: '',
        serviceId: '42',
        servicePresence: 'not_has',
        page: 1,
      }),
    ).toMatchObject({
      service_id: '42',
      service_presence: 'not_has',
    });

    expect(
      buildStudentsListQueryParams({
        search: '',
        classId: '',
        levelId: '',
        statusFilter: '',
        accountFilter: '',
        serviceId: '',
        servicePresence: 'has',
        page: 1,
      }).service_id,
    ).toBeUndefined();
  });
});

describe('buildStudentSearchQueryParams', () => {
  it('builds the expected list request params', () => {
    expect(buildStudentSearchQueryParams('  ali  '.trim(), 42)).toEqual({
      search: 'ali',
      page: STUDENT_SEARCH_PAGE,
      page_size: STUDENT_SEARCH_PAGE_SIZE,
      active_school_id: 42,
    });
    expect(buildStudentSearchQueryParams('ali', null).active_school_id).toBeUndefined();
  });
});

describe('parseStudentSearchSuggestion', () => {
  it('returns null when did_you_mean is absent or null', () => {
    expect(parseStudentSearchSuggestion(undefined)).toBeNull();
    expect(parseStudentSearchSuggestion({})).toBeNull();
    expect(parseStudentSearchSuggestion({ did_you_mean: null })).toBeNull();
  });

  it('returns the suggested query when did_you_mean is present', () => {
    expect(parseStudentSearchSuggestion({ did_you_mean: { query: 'غيثة' } })).toBe('غيثة');
  });
});

describe('fetchStudentSearchHits', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests GET /admin/students with search pagination and active school', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [sampleHit({ id: 1, matched_on: 'name' })],
      meta: {},
    });

    const { results, suggestion } = await fetchStudentSearchHits('ahmed', 7);

    expect(getMock).toHaveBeenCalledOnce();
    expect(getMock).toHaveBeenCalledWith('/admin/students', {
      search: 'ahmed',
      page: 1,
      page_size: 10,
      active_school_id: 7,
    });
    expect(results).toEqual([expect.objectContaining({ id: 1, matched_on: 'name' })]);
    expect(suggestion).toBeNull();
  });

  it('does not call api when shouldFetchStudentSearch is false', () => {
    expect(shouldFetchStudentSearch('x')).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('passes matched_on through in results', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [
        sampleHit({ id: 2, matched_on: 'massar' }),
        sampleHit({ id: 3, matched_on: 'guardian_phone' }),
      ],
      meta: {},
    });

    const { results } = await fetchStudentSearchHits('0612', 1);

    expect(results[0]?.matched_on).toBe('massar');
    expect(results[1]?.matched_on).toBe('guardian_phone');
  });

  it('passes did_you_mean suggestion through when there are no results', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [],
      meta: { did_you_mean: { query: 'غيثة' } },
    });

    const { results, suggestion } = await fetchStudentSearchHits('غيثه', 1);

    expect(results).toEqual([]);
    expect(suggestion).toBe('غيثة');
  });
});

describe('executeStudentSearchQuery race protection', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns stale when a newer request supersedes the in-flight one', async () => {
    let resolveFirst: (value: { success: boolean; data: StudentSearchHit[]; meta: object }) => void;
    const first = new Promise<{ success: boolean; data: StudentSearchHit[]; meta: object }>((resolve) => {
      resolveFirst = resolve;
    });

    getMock.mockReturnValueOnce(first);

    let currentSeq = 1;
    const promise = executeStudentSearchQuery('ab', 5, 1, () => currentSeq);

    currentSeq = 2;
    resolveFirst!({
      success: true,
      data: [sampleHit({ id: 99, matched_on: 'student_code' })],
      meta: {},
    });

    await expect(promise).resolves.toEqual({ kind: 'stale' });
  });

  it('returns success for the latest request', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [sampleHit({ id: 4, matched_on: 'name' })],
      meta: {},
    });

    let currentSeq = 3;
    await expect(
      executeStudentSearchQuery('sara', 2, 3, () => currentSeq),
    ).resolves.toEqual({
      kind: 'success',
      results: [expect.objectContaining({ id: 4, matched_on: 'name' })],
      suggestion: null,
    });
  });

  it('returns suggestion from meta on zero-result success', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: [],
      meta: { did_you_mean: { query: 'غيثة' } },
    });

    let currentSeq = 4;
    await expect(
      executeStudentSearchQuery('غيثه', 2, 4, () => currentSeq),
    ).resolves.toEqual({
      kind: 'success',
      results: [],
      suggestion: 'غيثة',
    });
  });
});
