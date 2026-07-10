/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { TimetableSlot } from '@/types/timetable';
import { dayLabel, formatTimeRange } from '@/features/timetable/utils';
import type { TranslateFn } from '@/features/i18n/locale-context';

export const TIMETABLE_ADMIN_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type TimetableAdminDay = (typeof TIMETABLE_ADMIN_DAYS)[number];

export type TimetableListEmptyVariant = 'no-data' | 'no-match';

export function timetableHasActiveFilters(options: {
  classFilter?: string;
  teacherFilter?: string;
  dayFilter?: string;
}): boolean {
  return !!(options.classFilter || options.teacherFilter || options.dayFilter);
}

export function resolveTimetableEmptyVariant(options: {
  hasActiveFilters: boolean;
}): TimetableListEmptyVariant {
  return options.hasActiveFilters ? 'no-match' : 'no-data';
}

export function filterTimetableSlots(
  rows: TimetableSlot[],
  options: {
    classFilter?: string;
    teacherFilter?: string;
    dayFilter?: string;
  },
): TimetableSlot[] {
  return rows.filter((slot) => {
    if (options.classFilter && String(slot.class?.id) !== options.classFilter) return false;
    if (options.teacherFilter && String(slot.teacher?.id) !== options.teacherFilter) {
      return false;
    }
    if (options.dayFilter && slot.day !== options.dayFilter) return false;
    return true;
  });
}

export function presentTimetableDay(
  slot: Pick<TimetableSlot, 'day' | 'day_label'>,
  t: TranslateFn,
  fallback: string,
): string {
  if (slot.day_label) return slot.day_label;
  return dayLabel(slot.day, t, fallback);
}

export function presentTimetableTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
  fallback: string,
): string {
  const value = formatTimeRange(start, end);
  return value === '—' ? fallback : value;
}
