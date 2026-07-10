import { describe, expect, it } from 'vitest';
import {
  EXAM_RESULTS_PAGE_SIZE,
  examResultsListHasActiveQuery,
  formatExamResultListDate,
  formatExamResultScore,
  resolveExamResultsListEmptyVariant,
} from '@/features/admin/exam-results/utils/exam-results-list-present';

describe('exam-results-list-present', () => {
  it('uses page size 20 for API pagination', () => {
    expect(EXAM_RESULTS_PAGE_SIZE).toBe(20);
  });

  it('detects active class or state filters without inventing search', () => {
    expect(examResultsListHasActiveQuery({})).toBe(false);
    expect(examResultsListHasActiveQuery({ classId: '12' })).toBe(true);
    expect(examResultsListHasActiveQuery({ stateFilter: 'published' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveExamResultsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveExamResultsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates or returns empty label', () => {
    expect(formatExamResultListDate(null, () => '01/01/2026', '—')).toBe('—');
    expect(formatExamResultListDate('2026-01-01', (v) => `fmt:${v}`, '—')).toBe(
      'fmt:2026-01-01',
    );
  });

  it('formats score over max without inventing pass/fail semantics', () => {
    expect(formatExamResultScore(-1, 20, '—')).toBe('—');
    expect(formatExamResultScore(null, 20, '—')).toBe('—');
    expect(formatExamResultScore(14, 20, '—')).toBe('14/20');
    expect(formatExamResultScore(14, null, '—')).toBe('14');
  });
});
