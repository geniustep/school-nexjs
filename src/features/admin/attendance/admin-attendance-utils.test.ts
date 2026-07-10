import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_PAGE_SIZE,
  hasActiveAttendanceFilters,
  isDefaultFilters,
  resolveAttendanceListEmptyVariant,
  resolveInitialDate,
  todayIso,
} from '@/features/admin/attendance/admin-attendance-utils';

describe('admin-attendance-utils', () => {
  it('uses page size 20 for API pagination', () => {
    expect(ATTENDANCE_PAGE_SIZE).toBe(20);
  });

  it('resolveInitialDate defaults to today', () => {
    expect(resolveInitialDate(null)).toBe(todayIso());
    expect(resolveInitialDate('today')).toBe(todayIso());
    expect(resolveInitialDate('2026-03-15')).toBe('2026-03-15');
  });

  it('isDefaultFilters is true only for today with no status or class', () => {
    expect(isDefaultFilters(todayIso(), '', '')).toBe(true);
    expect(isDefaultFilters('2026-01-01', '', '')).toBe(false);
    expect(isDefaultFilters(todayIso(), 'absent', '')).toBe(false);
    expect(isDefaultFilters(todayIso(), '', '12')).toBe(false);
  });

  it('hasActiveAttendanceFilters mirrors isDefaultFilters', () => {
    expect(hasActiveAttendanceFilters(todayIso(), '', '')).toBe(false);
    expect(hasActiveAttendanceFilters('2026-01-01', 'late', '3')).toBe(true);
  });

  it('resolveAttendanceListEmptyVariant separates no-data and no-match', () => {
    expect(
      resolveAttendanceListEmptyVariant({ hasActiveFilters: false, recordCount: 5 }),
    ).toBe('none');
    expect(
      resolveAttendanceListEmptyVariant({ hasActiveFilters: false, recordCount: 0 }),
    ).toBe('no-data');
    expect(
      resolveAttendanceListEmptyVariant({ hasActiveFilters: true, recordCount: 0 }),
    ).toBe('no-match');
  });
});
