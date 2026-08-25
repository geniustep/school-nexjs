import { describe, expect, it } from 'vitest';
import {
  academicCalendarWarningKind,
  academicCalendarWarningLevel,
  countAcademicCalendarActionableWarnings,
  groupAcademicCalendarWarnings,
  shouldShowAcademicCalendarWarning,
} from './academic-calendar-warning-review';

const warning = (overrides: Partial<{ code: string; message: string; severity: string }> = {}) => ({
  code: overrides.code,
  message: overrides.message ?? 'Warning',
  severity: overrides.severity,
});

describe('academic calendar warning review', () => {
  it('keeps backend errors as blockers', () => {
    const item = warning({ code: 'event_outside_academic_year', severity: 'error' });
    expect(academicCalendarWarningLevel(item)).toBe('blocker');
    expect(shouldShowAcademicCalendarWarning(item)).toBe(true);
  });

  it('classifies normal overlaps as soft warnings but hides them when they are not actionable', () => {
    const item = warning({
      code: 'event_overlap',
      message: 'Overlap with another calendar event',
      severity: 'warning',
    });
    expect(academicCalendarWarningKind(item)).toBe('overlap');
    expect(academicCalendarWarningLevel(item)).toBe('warning');
    expect(shouldShowAcademicCalendarWarning(item)).toBe(false);
    expect(groupAcademicCalendarWarnings([item])).toEqual([]);
  });

  it('never hides an overlap when Backend marks it as an error', () => {
    const item = warning({
      code: 'event_overlap',
      message: 'Overlap blocks this calendar action',
      severity: 'error',
    });
    expect(academicCalendarWarningKind(item)).toBe('overlap');
    expect(academicCalendarWarningLevel(item)).toBe('blocker');
    expect(shouldShowAcademicCalendarWarning(item)).toBe(true);
    expect(groupAcademicCalendarWarnings([item])).toHaveLength(1);
  });

  it('presents out-of-year soft warnings as operational information', () => {
    const item = warning({
      code: 'event_outside_academic_year',
      message: 'Event is outside the academic year range',
      severity: 'warning',
    });
    expect(academicCalendarWarningKind(item)).toBe('outside_operational_range');
    expect(academicCalendarWarningLevel(item)).toBe('info');
    expect(shouldShowAcademicCalendarWarning(item)).toBe(true);
  });

  it('hides placeholder warnings that provide no useful detail', () => {
    expect(shouldShowAcademicCalendarWarning(warning({ message: 'Warning', severity: 'warning' }))).toBe(false);
    expect(shouldShowAcademicCalendarWarning(warning({ message: 'تنبيه', severity: 'warning' }))).toBe(false);
  });

  it('keeps specific generic warnings and deduplicates repeated occurrences', () => {
    const items = groupAcademicCalendarWarnings([
      warning({ code: 'calendar_note', message: 'Review the school closure date', severity: 'warning' }),
      warning({ code: 'calendar_note', message: 'Review the school closure date', severity: 'warning' }),
      warning({ code: 'calendar_note', message: 'Review the provisional event status', severity: 'warning' }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.count).toBe(2);
    expect(items[1]?.count).toBe(1);
  });

  it('counts only actionable warnings and blockers for list badges', () => {
    expect(
      countAcademicCalendarActionableWarnings([
        warning({ code: 'event_overlap', message: 'Overlap with another calendar event', severity: 'warning' }),
        warning({
          code: 'event_outside_academic_year',
          message: 'Event is outside the academic year range',
          severity: 'warning',
        }),
        warning({ code: 'calendar_note', message: 'Review the school closure date', severity: 'warning' }),
        warning({ code: 'event_overlap', message: 'Overlap blocks this calendar action', severity: 'error' }),
      ]),
    ).toBe(2);
  });

  it('returns zero for a list row containing only hidden overlaps and information', () => {
    expect(
      countAcademicCalendarActionableWarnings([
        warning({ code: 'event_overlap', message: 'Overlap with another calendar event', severity: 'warning' }),
        warning({ code: 'event_overlap', message: 'Overlap with another calendar event', severity: 'warning' }),
        warning({
          code: 'event_outside_academic_year',
          message: 'Event is outside the academic year range',
          severity: 'warning',
        }),
      ]),
    ).toBe(0);
  });
});
