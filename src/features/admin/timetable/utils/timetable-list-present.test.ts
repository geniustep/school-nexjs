/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { describe, expect, it } from 'vitest';
import {
  filterTimetableSlots,
  presentTimetableDay,
  presentTimetableTimeRange,
  resolveTimetableEmptyVariant,
  timetableHasActiveFilters,
} from '@/features/admin/timetable/utils/timetable-list-present';
import type { TimetableSlot } from '@/types/timetable';

const slots: TimetableSlot[] = [
  {
    id: 1,
    day: 'monday',
    day_label: 'Monday',
    start_time: '08:30',
    end_time: '10:00',
    class: { id: 10, name: '1A' },
    teacher: { id: 20, name: 'Sara' },
    subject: { id: 30, name: 'Math' },
  },
  {
    id: 2,
    day: 'tuesday',
    start_time: '10:00',
    end_time: '11:30',
    class: { id: 11, name: '2B' },
    teacher: { id: 21, name: 'Omar' },
    subject: { id: 31, name: 'Arabic' },
  },
];

describe('timetable-list-present', () => {
  it('detects active client-side filters', () => {
    expect(timetableHasActiveFilters({})).toBe(false);
    expect(timetableHasActiveFilters({ classFilter: '10' })).toBe(true);
    expect(timetableHasActiveFilters({ teacherFilter: '20' })).toBe(true);
    expect(timetableHasActiveFilters({ dayFilter: 'monday' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveTimetableEmptyVariant({ hasActiveFilters: false })).toBe('no-data');
    expect(resolveTimetableEmptyVariant({ hasActiveFilters: true })).toBe('no-match');
  });

  it('filters slots without changing slot semantics', () => {
    expect(filterTimetableSlots(slots, { classFilter: '10' })).toHaveLength(1);
    expect(filterTimetableSlots(slots, { teacherFilter: '21' })[0]?.id).toBe(2);
    expect(filterTimetableSlots(slots, { dayFilter: 'monday' })[0]?.id).toBe(1);
    expect(filterTimetableSlots(slots, {})).toHaveLength(2);
  });

  it('presents day and time for scanning', () => {
    const t = (key: string) => (key === 'days.tuesday' ? 'Tuesday' : key);
    expect(presentTimetableDay(slots[0]!, t, '—')).toBe('Monday');
    expect(presentTimetableDay(slots[1]!, t, '—')).toBe('Tuesday');
    expect(presentTimetableTimeRange('08:30', '10:00', '—')).toBe('08:30 - 10:00');
    expect(presentTimetableTimeRange(null, null, '—')).toBe('—');
  });
});
