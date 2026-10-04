import { describe, expect, it } from 'vitest';
import { formatDateShort, formatDateTime } from './format';

const RTL_ISOLATE_START = '\u2067';
const DIRECTIONAL_ISOLATE_END = '\u2069';

function stripDirectionalIsolation(value: string): string {
  return value
    .replaceAll(RTL_ISOLATE_START, '')
    .replaceAll(DIRECTIONAL_ISOLATE_END, '');
}

describe('localized date formatting', () => {
  it('keeps Arabic day-month-year order isolated from surrounding LTR containers', () => {
    const value = formatDateShort('2026-10-04', 'ar');

    expect(value.startsWith(RTL_ISOLATE_START)).toBe(true);
    expect(value.endsWith(DIRECTIONAL_ISOLATE_END)).toBe(true);
    expect(stripDirectionalIsolation(value)).toBe('4 أكتوبر 2026');
  });

  it('keeps Arabic date-time order stable with the date before the time', () => {
    const value = stripDirectionalIsolation(
      formatDateTime('2026-10-04T10:08:00Z', 'ar'),
    );

    expect(value).toContain('4 أكتوبر 2026');
    expect(value.indexOf('4 أكتوبر 2026')).toBeLessThan(value.indexOf('10:08'));
  });

  it('does not add RTL isolation to non-Arabic dates', () => {
    const value = formatDateShort('2026-10-04', 'fr');

    expect(value.includes(RTL_ISOLATE_START)).toBe(false);
    expect(value.includes(DIRECTIONAL_ISOLATE_END)).toBe(false);
  });
});
