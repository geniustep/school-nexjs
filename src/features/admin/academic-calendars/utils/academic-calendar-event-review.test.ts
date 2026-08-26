import { describe, expect, it } from 'vitest';
import type { AcademicCalendarEvent } from '@/types/academic-calendar';
import {
  academicCalendarDuplicateEventGroups,
  academicCalendarEventMatchesReadingFilter,
  academicCalendarEventReadingFilter,
} from './academic-calendar-event-review';

function event(overrides: Partial<AcademicCalendarEvent> = {}): AcademicCalendarEvent {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'حدث',
    event_type: overrides.event_type ?? 'special_event',
    date_from: overrides.date_from ?? '2026-11-06',
    date_to: overrides.date_to ?? '2026-11-06',
    status: overrides.status ?? 'confirmed',
    scope_type: overrides.scope_type ?? 'school',
    day_part: overrides.day_part ?? 'full_day',
    active: overrides.active ?? true,
    ...overrides,
  };
}

describe('academic calendar event reading filters', () => {
  it('keeps backend holiday and closure types in the holiday/closure filter', () => {
    expect(academicCalendarEventReadingFilter(event({ event_type: 'national_holiday' }))).toBe('holiday_closure');
    expect(academicCalendarEventReadingFilter(event({ event_type: 'school_closure' }))).toBe('holiday_closure');
    expect(academicCalendarEventMatchesReadingFilter(event({ event_type: 'mid_year_break' }), 'holiday_closure')).toBe(true);
  });

  it('classifies exams by the human-facing name without changing special_event', () => {
    const exam = event({ name: 'الامتحان الموحد المحلي — الثانوي الإعدادي', event_type: 'special_event' });
    expect(academicCalendarEventReadingFilter(exam)).toBe('exam');
    expect(exam.event_type).toBe('special_event');
  });

  it('keeps non-exam special events as school milestones', () => {
    expect(
      academicCalendarEventReadingFilter(
        event({ name: 'انطلاق السنة الدراسية 2026/2027', event_type: 'special_event' }),
      ),
    ).toBe('milestone');
  });
});

describe('academic calendar duplicate event review', () => {
  it('detects identical active records by name, period, scope and day part', () => {
    const groups = academicCalendarDuplicateEventGroups([
      event({ id: 1, name: 'ذكرى المسيرة الخضراء' }),
      event({ id: 2, name: 'ذكرى المسيرة الخضراء' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.events.map((item) => item.id)).toEqual([1, 2]);
  });

  it('does not treat events in different scopes or periods as duplicates', () => {
    const groups = academicCalendarDuplicateEventGroups([
      event({ id: 1, name: 'ذكرى المسيرة الخضراء', scope_type: 'school' }),
      event({ id: 2, name: 'ذكرى المسيرة الخضراء', scope_type: 'level', level: { id: 7, name: 'السادس' } }),
      event({ id: 3, name: 'ذكرى المسيرة الخضراء', date_from: '2026-11-07', date_to: '2026-11-07' }),
    ]);

    expect(groups).toEqual([]);
  });

  it('ignores inactive duplicate records', () => {
    const groups = academicCalendarDuplicateEventGroups([
      event({ id: 1, name: 'عيد الوحدة' }),
      event({ id: 2, name: 'عيد الوحدة', active: false }),
    ]);

    expect(groups).toEqual([]);
  });
});
