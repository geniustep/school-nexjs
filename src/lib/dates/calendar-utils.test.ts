import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  isoToDisplayDate,
  parseFlexibleDateInput,
  parseIsoDate,
  shiftIsoDate,
  startOfMonthIso,
  toIsoDate,
} from './calendar-utils';

describe('calendar-utils', () => {
  it('parses and formats ISO dates', () => {
    expect(parseIsoDate('2026-07-01')).toEqual({ year: 2026, month: 7, day: 1 });
    expect(toIsoDate(2026, 7, 1)).toBe('2026-07-01');
    expect(isoToDisplayDate('2026-07-01')).toBe('01/07/2026');
  });

  it('parses flexible typed dates', () => {
    expect(parseFlexibleDateInput('01/07/2026')).toBe('2026-07-01');
    expect(parseFlexibleDateInput('2026-07-01')).toBe('2026-07-01');
    expect(parseFlexibleDateInput('31/02/2026')).toBeNull();
    expect(parseFlexibleDateInput('15/07/202')).toBeNull();
    expect(parseFlexibleDateInput('')).toBe('');
  });

  it('shifts dates and finds month start', () => {
    expect(shiftIsoDate('2026-07-15', -1)).toBe('2026-07-14');
    expect(startOfMonthIso('2026-07-15')).toBe('2026-07-01');
  });

  it('builds a month grid with selected and today markers', () => {
    const grid = buildMonthGrid({
      viewYear: 2026,
      viewMonth: 7,
      selectedIso: '2026-07-15',
      todayIso: '2026-07-01',
      weekStartsOn: 1,
    });

    const days = grid.filter((cell) => cell.type === 'day');
    expect(days).toHaveLength(31);
    expect(days.find((cell) => cell.type === 'day' && cell.iso === '2026-07-15')?.isSelected).toBe(true);
    expect(days.find((cell) => cell.type === 'day' && cell.iso === '2026-07-01')?.isToday).toBe(true);
  });
});
