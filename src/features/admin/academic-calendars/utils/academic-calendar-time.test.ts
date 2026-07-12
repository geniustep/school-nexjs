import { describe, expect, it } from 'vitest';
import {
  academicCalendarClockToFloatHours,
  academicCalendarFloatHoursToClock,
  academicCalendarTimeToPayload,
  normalizeAcademicCalendarTimeValue,
} from './academic-calendar-time';

describe('academic calendar time conversion', () => {
  it('converts float hours to HH:MM', () => {
    expect(academicCalendarFloatHoursToClock(8.5)).toBe('08:30');
    expect(academicCalendarFloatHoursToClock(13.25)).toBe('13:15');
    expect(academicCalendarFloatHoursToClock(0)).toBe('00:00');
    expect(academicCalendarFloatHoursToClock(23.75)).toBe('23:45');
  });

  it('converts HH:MM to float hours', () => {
    expect(academicCalendarClockToFloatHours('08:30')).toBe(8.5);
    expect(academicCalendarClockToFloatHours('13:15')).toBe(13.25);
    expect(academicCalendarClockToFloatHours('8:30')).toBe(8.5);
  });

  it('round-trips contract examples', () => {
    expect(academicCalendarClockToFloatHours(academicCalendarFloatHoursToClock(8.5)!)).toBe(8.5);
    expect(academicCalendarClockToFloatHours(academicCalendarFloatHoursToClock(13.25)!)).toBe(13.25);
    expect(academicCalendarFloatHoursToClock(academicCalendarClockToFloatHours('08:30')!)).toBe(
      '08:30',
    );
    expect(academicCalendarFloatHoursToClock(academicCalendarClockToFloatHours('13:15')!)).toBe(
      '13:15',
    );
  });

  it('normalizes API float or clock strings for display', () => {
    expect(normalizeAcademicCalendarTimeValue(8.5)).toBe('08:30');
    expect(normalizeAcademicCalendarTimeValue(13.25)).toBe('13:15');
    expect(normalizeAcademicCalendarTimeValue('08:30')).toBe('08:30');
    expect(normalizeAcademicCalendarTimeValue('8.5')).toBe('08:30');
    expect(normalizeAcademicCalendarTimeValue(null)).toBeNull();
  });

  it('builds payload float hours from clock display', () => {
    expect(academicCalendarTimeToPayload('08:30')).toBe(8.5);
    expect(academicCalendarTimeToPayload('13:15')).toBe(13.25);
    expect(academicCalendarTimeToPayload('')).toBeUndefined();
  });
});
