import type { TimetableSlot } from '@/types/timetable';
import type { TranslateFn } from '@/features/i18n/locale-context';

export const WEEK_DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function dayLabel(
  day: string | null | undefined,
  t: TranslateFn,
  fallback?: string | null,
): string {
  if (!day) return fallback ?? '—';
  const key = `days.${day.toLowerCase()}`;
  const label = t(key);
  return label === key ? (fallback ?? day) : label;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return '—';
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? '—';
}

export function slotStatus(slot: TimetableSlot): 'current' | 'next' | 'normal' {
  if (slot.is_current) return 'current';
  if (slot.is_next) return 'next';
  return 'normal';
}

export function sortSlotsByTime(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort((a, b) =>
    (a.start_time ?? '').localeCompare(b.start_time ?? ''),
  );
}

export function weekHasSlots(week?: Record<string, TimetableSlot[]>): boolean {
  if (!week) return false;
  return Object.values(week).some((slots) => slots.length > 0);
}
