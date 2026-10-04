import type { Locale } from './config';
import { localeToBcp47 } from './config';
import { parseDateInput } from './parse-date-input';

const RTL_ISOLATE_START = '\u2067';
const DIRECTIONAL_ISOLATE_END = '\u2069';

function isolateLocalizedDate(value: string, locale: Locale): string {
  if (locale !== 'ar') return value;
  return `${RTL_ISOLATE_START}${value}${DIRECTIONAL_ISOLATE_END}`;
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = parseDateInput(value);
  if (!d) return value;
  return isolateLocalizedDate(
    d.toLocaleDateString(localeToBcp47(locale), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    locale,
  );
}

export function formatDateShort(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = parseDateInput(value);
  if (!d) return value;
  return isolateLocalizedDate(
    d.toLocaleDateString(localeToBcp47(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    locale,
  );
}

export function formatDateTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = parseDateInput(value);
  if (!d) return value;
  return isolateLocalizedDate(
    d.toLocaleString(localeToBcp47(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    locale,
  );
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return '—';
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? '—';
}
