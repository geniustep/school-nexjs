import { describe, expect, it } from 'vitest';
import {
  buildStudentsListSearchParams,
  parseStudentsListUrl,
  serializeStudentsListUrl,
  studentsListHasActiveQuery,
  studentsListToApiParams,
  STUDENTS_LIST_DEFAULT_FILTERS,
} from './students-list-url';

describe('students-list-url', () => {
  it('parses defaults from an empty query string', () => {
    expect(parseStudentsListUrl(new URLSearchParams())).toEqual(STUDENTS_LIST_DEFAULT_FILTERS);
  });

  it('parses search, filters, and page from URL params', () => {
    const params = new URLSearchParams({
      search: '  ahmed  ',
      cycle: 'primary',
      level: '12',
      class: '34',
      status: 'active',
      account: 'has_account',
      page: '3',
    });

    expect(parseStudentsListUrl(params)).toEqual({
      search: 'ahmed',
      cycleCode: 'primary',
      levelId: '12',
      classId: '34',
      statusFilter: 'active',
      accountFilter: 'has_account',
      page: 3,
    });
  });

  it('rejects unknown status and account values', () => {
    const params = new URLSearchParams({
      status: 'deleted',
      account: 'unknown',
    });

    expect(parseStudentsListUrl(params)).toMatchObject({
      statusFilter: '',
      accountFilter: '',
    });
  });

  it('omits default values when serializing URL', () => {
    expect(serializeStudentsListUrl(STUDENTS_LIST_DEFAULT_FILTERS)).toBe('');
    expect(
      serializeStudentsListUrl({
        ...STUDENTS_LIST_DEFAULT_FILTERS,
        search: 'sara',
        statusFilter: 'suspended',
        page: 1,
      }),
    ).toBe('search=sara&status=suspended');
    expect(
      serializeStudentsListUrl({
        ...STUDENTS_LIST_DEFAULT_FILTERS,
        page: 2,
      }),
    ).toBe('page=2');
  });

  it('detects active query state', () => {
    expect(studentsListHasActiveQuery(STUDENTS_LIST_DEFAULT_FILTERS)).toBe(false);
    expect(
      studentsListHasActiveQuery({
        ...STUDENTS_LIST_DEFAULT_FILTERS,
        cycleCode: 'middle',
      }),
    ).toBe(true);
  });

  it('maps URL state to API params without cycleCode', () => {
    expect(
      studentsListToApiParams({
        search: 'ali',
        cycleCode: 'primary',
        levelId: '5',
        classId: '9',
        statusFilter: 'active',
        accountFilter: 'inactive_account',
        page: 2,
      }),
    ).toEqual({
      page: 2,
      page_size: 20,
      search: 'ali',
      level_id: '5',
      class_id: '9',
      status: 'active',
      account_status: 'inactive',
    });
  });

  it('builds round-trip search params', () => {
    const state = {
      search: 'youssef',
      cycleCode: '',
      levelId: '7',
      classId: '',
      statusFilter: '',
      accountFilter: 'no_account',
      page: 1,
    };
    const serialized = serializeStudentsListUrl(state);
    const parsed = parseStudentsListUrl(buildStudentsListSearchParams(state));
    expect(parsed).toEqual(state);
    expect(serialized).toBe('search=youssef&level=7&account=no_account');
  });
});

describe('students list filter reset semantics', () => {
  it('resets page when search changes in serialized output', () => {
    const before = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      search: 'old',
      page: 4,
    };
    const after = { ...before, search: 'new', page: 1 };
    expect(serializeStudentsListUrl(after)).toBe('search=new');
    expect(serializeStudentsListUrl(before)).toBe('search=old&page=4');
  });
});
