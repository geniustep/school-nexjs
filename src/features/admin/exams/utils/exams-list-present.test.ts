import { describe, expect, it } from 'vitest';
import {
  EXAMS_PAGE_SIZE,
  examsListHasActiveQuery,
  formatExamListDate,
  formatExamListSchedule,
  formatExamListType,
  resolveExamsListEmptyVariant,
} from '@/features/admin/exams/utils/exams-list-present';

describe('exams-list-present', () => {
  it('uses page size 20 for API pagination', () => {
    expect(EXAMS_PAGE_SIZE).toBe(20);
  });

  it('detects active class or state filters without inventing search', () => {
    expect(examsListHasActiveQuery({})).toBe(false);
    expect(examsListHasActiveQuery({ classId: '12' })).toBe(true);
    expect(examsListHasActiveQuery({ stateFilter: 'published' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveExamsListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveExamsListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates or returns empty label', () => {
    expect(formatExamListDate(null, () => '01/01/2026', '—')).toBe('—');
    expect(formatExamListDate('2026-01-01', (v) => `fmt:${v}`, '—')).toBe('fmt:2026-01-01');
  });

  it('prefers exam type label over raw type', () => {
    expect(formatExamListType('Midterm', 'midterm', '—')).toBe('Midterm');
    expect(formatExamListType(null, 'quiz', '—')).toBe('quiz');
    expect(formatExamListType(null, null, '—')).toBe('—');
  });

  it('formats schedule date and optional time range', () => {
    expect(
      formatExamListSchedule('2026-01-01', '09:00', '10:30', (v) => `d:${v}`, '—'),
    ).toEqual({ dateLabel: 'd:2026-01-01', timeLabel: '09:00 – 10:30' });
    expect(
      formatExamListSchedule(null, null, null, () => 'x', '—'),
    ).toEqual({ dateLabel: '—', timeLabel: null });
  });
});
