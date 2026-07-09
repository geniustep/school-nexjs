import { describe, expect, it } from 'vitest';
import {
  formatHomeworkListDate,
  HOMEWORKS_PAGE_SIZE,
  homeworksListHasActiveQuery,
  resolveHomeworksListEmptyVariant,
} from '@/features/admin/homeworks/utils/homeworks-list-present';

describe('homeworks-list-present', () => {
  it('uses page size 20 for API pagination', () => {
    expect(HOMEWORKS_PAGE_SIZE).toBe(20);
  });

  it('detects active search or filters', () => {
    expect(homeworksListHasActiveQuery({})).toBe(false);
    expect(homeworksListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(homeworksListHasActiveQuery({ search: 'math' })).toBe(true);
    expect(homeworksListHasActiveQuery({ classId: '12' })).toBe(true);
    expect(homeworksListHasActiveQuery({ stateFilter: 'published' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveHomeworksListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveHomeworksListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates or returns empty label', () => {
    expect(formatHomeworkListDate(null, () => '01/01/2026', '—')).toBe('—');
    expect(formatHomeworkListDate('2026-01-01', (v) => `fmt:${v}`, '—')).toBe('fmt:2026-01-01');
  });
});
