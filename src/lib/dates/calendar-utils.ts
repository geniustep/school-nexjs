import type { Locale } from '@/lib/i18n/config';
import { localeToBcp47 } from '@/lib/i18n/config';

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) return null;
  return { year, month, day };
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isoToDisplayDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return '';
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}

/** @deprecated Prefer displayDateToIso from date-input-mask for masked input. */
export function parseFlexibleDateInput(raw: string): string | null {
  const text = raw.trim();
  if (!text) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const digits = text.replace(/\D/g, '');
    const iso = toIsoDate(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2)));
    return parseIsoDate(iso) ? iso : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return parseIsoDate(text) ? text : null;
  }

  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (dayFirst) {
    const iso = toIsoDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
    return parseIsoDate(iso) ? iso : null;
  }

  const yearFirst = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(text);
  if (yearFirst) {
    const iso = toIsoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
    return parseIsoDate(iso) ? iso : null;
  }

  return null;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function shiftIsoDate(iso: string, days: number): string | null {
  const parts = parseIsoDate(iso);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day + days);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function startOfMonthIso(iso: string): string | null {
  const parts = parseIsoDate(iso);
  if (!parts) return null;
  return toIsoDate(parts.year, parts.month, 1);
}

export function localeWeekStartsOn(locale: Locale): number {
  try {
    const intlLocale = new Intl.Locale(localeToBcp47(locale)) as Intl.Locale & {
      weekInfo?: { firstDay?: number };
    };
    const firstDay = intlLocale.weekInfo?.firstDay;
    if (firstDay != null) {
      return firstDay === 7 ? 0 : firstDay;
    }
  } catch {
    /* Intl.Locale weekInfo not supported */
  }
  return locale === 'en' ? 0 : 1;
}

export function weekdayHeaders(locale: Locale): string[] {
  const bcp47 = localeToBcp47(locale);
  const formatter = new Intl.DateTimeFormat(bcp47, { weekday: 'short' });
  const start = localeWeekStartsOn(locale);
  const headers: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = (start + i) % 7;
    const ref = new Date(2024, 0, day === 0 ? 7 : day);
    headers.push(formatter.format(ref));
  }
  return headers;
}

export function formatMonthLabel(year: number, month: number, locale: Locale): string {
  return new Date(year, month - 1, 1).toLocaleDateString(localeToBcp47(locale), {
    month: 'long',
    year: 'numeric',
  });
}

export type CalendarCell =
  | { type: 'empty' }
  | {
      type: 'day';
      day: number;
      iso: string;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    };

export function buildMonthGrid(options: {
  viewYear: number;
  viewMonth: number;
  selectedIso: string;
  todayIso: string;
  weekStartsOn: number;
  min?: string;
  max?: string;
}): CalendarCell[] {
  const { viewYear, viewMonth, selectedIso, todayIso, weekStartsOn, min, max } = options;
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const offset = (firstDayOfWeek - weekStartsOn + 7) % 7;
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push({ type: 'empty' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIsoDate(viewYear, viewMonth, day);
    const isDisabled = Boolean((min && iso < min) || (max && iso > max));
    cells.push({
      type: 'day',
      day,
      iso,
      isToday: iso === todayIso,
      isSelected: iso === selectedIso,
      isDisabled,
    });
  }

  return cells;
}

export function isIsoInRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}
