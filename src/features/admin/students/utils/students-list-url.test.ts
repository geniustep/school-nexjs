import { describe, expect, it, vi } from 'vitest';
import {
  buildStudentsListSearchParams,
  parseStudentsListUrl,
  replaceStudentsListUrl,
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
      serviceId: '',
      servicePresence: '',
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

  it('preserves the external all-schools scope when replacing list filters', () => {
    const replace = vi.fn();
    replaceStudentsListUrl(
      { replace },
      '/admin/students',
      new URLSearchParams('scope=all-schools&search=old&page=3'),
      {
        ...STUDENTS_LIST_DEFAULT_FILTERS,
        search: 'new',
        page: 1,
      },
    );

    expect(replace).toHaveBeenCalledWith(
      '/admin/students?search=new&scope=all-schools',
      { scroll: false },
    );
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

  it('maps URL state to API params without cycleCode (API has no cycle filter)', () => {
    expect(
      studentsListToApiParams({
        search: 'ali',
        cycleCode: 'primary',
        levelId: '5',
        classId: '9',
        statusFilter: 'active',
        accountFilter: 'inactive_account',
        serviceId: '',
        servicePresence: '',
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
      serviceId: '',
      servicePresence: '' as const,
      page: 1,
    };
    const serialized = serializeStudentsListUrl(state);
    const parsed = parseStudentsListUrl(buildStudentsListSearchParams(state));
    expect(parsed).toEqual(state);
    expect(serialized).toBe('search=youssef&level=7&account=no_account');
  });
});

describe('students list financial service filter', () => {
  it('selects a service with default has presence and resets page', () => {
    const next = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      serviceId: '42',
      servicePresence: 'has' as const,
      levelId: '12',
      page: 1,
    };
    expect(serializeStudentsListUrl({ ...next, page: 5 })).toBe(
      'level=12&service_id=42&service_presence=has&page=5',
    );
    expect(serializeStudentsListUrl(next)).toBe(
      'level=12&service_id=42&service_presence=has',
    );
    expect(studentsListToApiParams(next)).toMatchObject({
      service_id: '42',
      service_presence: 'has',
      level_id: '12',
      page: 1,
    });
  });

  it('sends not_has when presence is not_has', () => {
    const state = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      serviceId: '42',
      servicePresence: 'not_has' as const,
      classId: '9',
      page: 1,
    };
    expect(serializeStudentsListUrl(state)).toBe(
      'class=9&service_id=42&service_presence=not_has',
    );
    expect(studentsListToApiParams(state)).toMatchObject({
      service_id: '42',
      service_presence: 'not_has',
      class_id: '9',
    });
  });

  it('defaults missing presence to has when service_id is present', () => {
    const parsed = parseStudentsListUrl(
      new URLSearchParams({ service_id: '7', level: '3' }),
    );
    expect(parsed).toMatchObject({
      serviceId: '7',
      servicePresence: 'has',
      levelId: '3',
    });
    expect(studentsListToApiParams(parsed)).toMatchObject({
      service_id: '7',
      service_presence: 'has',
      level_id: '3',
    });
  });

  it('removes service_id and service_presence together', () => {
    const cleared = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      levelId: '12',
      serviceId: '',
      servicePresence: '' as const,
      page: 1,
    };
    expect(serializeStudentsListUrl(cleared)).toBe('level=12');
    expect(studentsListToApiParams(cleared).service_id).toBeUndefined();
    expect(studentsListToApiParams(cleared).service_presence).toBeUndefined();
  });

  it('drops incomplete presence without service_id', () => {
    const parsed = parseStudentsListUrl(
      new URLSearchParams({ service_presence: 'not_has', level: '5' }),
    );
    expect(parsed.serviceId).toBe('');
    expect(parsed.servicePresence).toBe('');
    expect(serializeStudentsListUrl(parsed)).toBe('level=5');
  });

  it('keeps level or class when service filter changes', () => {
    const withLevel = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      levelId: '15',
      classId: '88',
      serviceId: '42',
      servicePresence: 'has' as const,
      page: 1,
    };
    expect(serializeStudentsListUrl(withLevel)).toBe(
      'level=15&class=88&service_id=42&service_presence=has',
    );
    const notHas = { ...withLevel, servicePresence: 'not_has' as const, page: 1 };
    expect(serializeStudentsListUrl(notHas)).toBe(
      'level=15&class=88&service_id=42&service_presence=not_has',
    );
    expect(studentsListHasActiveQuery(withLevel)).toBe(true);
  });

  it('rejects non-numeric service_id', () => {
    const parsed = parseStudentsListUrl(
      new URLSearchParams({ service_id: 'transport', service_presence: 'has' }),
    );
    expect(parsed.serviceId).toBe('');
    expect(parsed.servicePresence).toBe('');
  });

  it('card select always sets has and clears both params together', () => {
    const selected = {
      ...STUDENTS_LIST_DEFAULT_FILTERS,
      levelId: '15',
      classId: '88',
      statusFilter: 'active',
      search: 'أحمد',
      serviceId: '1310',
      servicePresence: 'has' as const,
      page: 1,
    };
    expect(serializeStudentsListUrl(selected)).toBe(
      'search=%D8%A3%D8%AD%D9%85%D8%AF&level=15&class=88&status=active&service_id=1310&service_presence=has',
    );
    const cleared = {
      ...selected,
      serviceId: '',
      servicePresence: '' as const,
      page: 1,
    };
    expect(serializeStudentsListUrl(cleared)).toBe(
      'search=%D8%A3%D8%AD%D9%85%D8%AF&level=15&class=88&status=active',
    );
    const fromPage = { ...selected, page: 4 };
    const resetPage = { ...selected, page: 1 };
    expect(serializeStudentsListUrl(fromPage)).toContain('page=4');
    expect(serializeStudentsListUrl(resetPage)).not.toContain('page=');
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
