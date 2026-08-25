import { describe, expect, it } from 'vitest';
import {
  academicCalendarWarningKind,
  academicCalendarWarningLevel,
  groupAcademicCalendarWarnings,
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
  });

  it('treats normal overlaps as review warnings, not blockers', () => {
    const item = warning({ code: 'event_overlap', message: 'Overlap with another calendar event', severity: 'warning' });
    expect(academicCalendarWarningKind(item)).toBe('overlap');
    expect(academicCalendarWarningLevel(item)).toBe('warning');
  });

  it('presents out-of-year soft warnings as operational information', () => {
    const item = warning({
      code: 'event_outside_academic_year',
      message: 'Event is outside the academic year range',
      severity: 'warning',
    });
    expect(academicCalendarWarningKind(item)).toBe('outside_operational_range');
    expect(academicCalendarWarningLevel(item)).toBe('info');
  });

  it('deduplicates repeated warnings while preserving their occurrence count', () => {
    const items = groupAcademicCalendarWarnings([
      warning({ code: 'event_overlap', message: 'Overlap', severity: 'warning' }),
      warning({ code: 'event_overlap', message: 'Overlap', severity: 'warning' }),
      warning({ code: 'event_overlap', message: 'Another overlap', severity: 'warning' }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.count).toBe(2);
    expect(items[1]?.count).toBe(1);
  });
});
