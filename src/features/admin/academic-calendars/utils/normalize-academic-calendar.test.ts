import { describe, expect, it } from 'vitest';
import {
  academicCalendarAllowsAction,
  academicCalendarStudyDaysDisplay,
  normalizeAcademicCalendarAllowedActions,
  normalizeAcademicCalendarClosureContext,
  normalizeAcademicCalendarDetail,
  normalizeAcademicCalendarEffectiveEvents,
  normalizeAcademicCalendarEvent,
  normalizeAcademicCalendars,
  unwrapAcademicCalendarMutationData,
} from './normalize-academic-calendar';

/** Live school DB fixture — calendar id 20 (module 18.0.1.0.188). */
const DEMO_LIST_ROW = {
  id: 20,
  name: 'التقويم المدرسي 2026–2027',
  display_name: 'التقويم المدرسي 2026–2027 v1 — raqeem 2026-2027 [Published / منشور]',
  state: 'published',
  version_number: 1,
  school: { id: 3, name: 'مدرسة رقيم التجريبية' },
  academic_year: {
    id: 1,
    name: 'raqeem 2026-2027',
    date_start: '2026-09-01',
    date_end: '2027-06-30',
  },
  effective_from: '2026-09-01',
  effective_to: '2027-06-30',
  source_type: 'school_local',
  source_reference: 'DEMO_CALENDAR_HOLIDAYS_CORE_1',
  published_at: '2026-07-12 15:18:02',
  summary: {
    event_count: 5,
    provisional_event_count: 1,
    confirmed_event_count: 4,
    cancelled_event_count: 0,
    calendar_day_count: 19,
    study_day_count: 0,
    study_day_count_reliable: false,
    warnings: [
      'Study-day count unavailable: no reliable working-day settings for this school/year. Returning calendar days only.',
    ],
  },
  allowed_actions: {
    view: true,
    edit: false,
    add_event: false,
    edit_event: false,
    delete_event: false,
    submit_review: false,
    reset_to_draft: false,
    publish: false,
    duplicate: true,
    archive: true,
  },
};

const DEMO_EVENT_23 = {
  id: 23,
  name: 'عيد الفطر (مؤقت)',
  event_type: 'religious_holiday',
  date_from: '2027-03-20',
  date_to: '2027-03-21',
  day_part: 'full_day',
  time_from: null,
  time_to: null,
  status: 'provisional',
  scope_type: 'school',
  cycle: null,
  level: null,
  class: null,
  is_school_closed: true,
  blocks_timetable: true,
  blocks_attendance: true,
  blocks_exams: true,
  affects_services: true,
  source_type: 'official',
  source_reference: 'RELIGIOUS_PROVISIONAL',
  is_local_override: false,
  notes: null,
  sequence: 10,
  active: true,
};

describe('normalizeAcademicCalendarAllowedActions', () => {
  it('keeps boolean map keys exactly as returned by API', () => {
    expect(
      normalizeAcademicCalendarAllowedActions({
        duplicate: true,
        archive: true,
        add_event: false,
        edit_event: false,
      }),
    ).toEqual({
      duplicate: true,
      archive: true,
      add_event: false,
      edit_event: false,
    });
  });

  it('rejects array allowed_actions (no silent aliasing)', () => {
    expect(normalizeAcademicCalendarAllowedActions(['publish', 'submit-review'])).toBeUndefined();
  });

  it('ignores non-boolean values', () => {
    expect(
      normalizeAcademicCalendarAllowedActions({
        edit: true,
        publish: '1',
      }),
    ).toEqual({ edit: true });
  });
});

describe('academicCalendarAllowsAction', () => {
  it('never infers grants from missing allowed_actions', () => {
    expect(academicCalendarAllowsAction({ allowed_actions: undefined }, 'publish')).toBe(false);
    expect(academicCalendarAllowsAction(null, 'publish')).toBe(false);
  });

  it('uses exact keys add_event / edit_event (no create_event alias)', () => {
    expect(academicCalendarAllowsAction({ allowed_actions: { add_event: true } }, 'add_event')).toBe(
      true,
    );
    expect(
      academicCalendarAllowsAction({ allowed_actions: { add_event: true } }, 'create_event'),
    ).toBe(false);
    expect(
      academicCalendarAllowsAction({ allowed_actions: { edit_event: true } }, 'update_event'),
    ).toBe(false);
  });

  it('requires explicit true', () => {
    expect(academicCalendarAllowsAction({ allowed_actions: { publish: false } }, 'publish')).toBe(
      false,
    );
  });
});

describe('normalizeAcademicCalendars', () => {
  it('maps live list row for demo calendar 20', () => {
    const rows = normalizeAcademicCalendars([DEMO_LIST_ROW]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 20,
      state: 'published',
      version_number: 1,
      school_id: 3,
      academic_year_id: 1,
      academic_year_name: 'raqeem 2026-2027',
      effective_from: '2026-09-01',
      effective_to: '2027-06-30',
      event_count: 5,
      provisional_event_count: 1,
      allowed_actions: { duplicate: true, archive: true, edit: false },
    });
    expect(rows[0].warnings?.[0]?.message).toContain('Study-day count unavailable');
  });
});

describe('normalizeAcademicCalendarDetail', () => {
  it('keeps summary reliability and provisional event 23', () => {
    const detail = normalizeAcademicCalendarDetail({
      ...DEMO_LIST_ROW,
      change_reason: 'بيانات تجريبية',
      notes: null,
      source_calendar: null,
      published_by: { id: 1, name: 'OdooBot' },
      events: [
        {
          id: 20,
          name: 'عطلة الفترة البينية الأولى',
          event_type: 'inter_term_break',
          date_from: '2026-10-26',
          date_to: '2026-11-01',
          day_part: 'full_day',
          status: 'confirmed',
          scope_type: 'school',
          cycle: null,
          level: null,
          class: null,
          is_school_closed: true,
          blocks_timetable: true,
          blocks_attendance: true,
          blocks_exams: true,
          affects_services: true,
          source_type: 'official',
          source_reference: 'OFFICIAL_INTER_TERM_1',
          is_local_override: false,
          notes: null,
          sequence: 10,
          active: true,
        },
        DEMO_EVENT_23,
      ],
      provisional_events: [DEMO_EVENT_23],
    });

    expect(detail?.events).toHaveLength(2);
    expect(detail?.provisional_events?.[0]).toMatchObject({
      id: 23,
      event_type: 'religious_holiday',
      status: 'provisional',
      date_from: '2027-03-20',
    });
    expect(detail?.summary?.calendar_day_count).toBe(19);
    expect(detail?.summary?.study_day_count).toBe(0);
    expect(detail?.summary?.study_day_count_reliable).toBe(false);
    expect(academicCalendarStudyDaysDisplay(detail?.summary).reliable).toBe(false);
    expect(academicCalendarStudyDaysDisplay(detail?.summary).value).toBeNull();
  });

  it('rejects legacy date_start / date_end event aliases', () => {
    expect(
      normalizeAcademicCalendarEvent({
        id: 99,
        name: 'legacy',
        event_type: 'school_closure',
        date_start: '2026-12-01',
        date_end: '2026-12-01',
        status: 'confirmed',
      }),
    ).toBeNull();
  });
});

describe('normalizeAcademicCalendarEffectiveEvents', () => {
  it('parses collection envelope', () => {
    const data = normalizeAcademicCalendarEffectiveEvents({
      academic_year_id: 1,
      school_id: 3,
      date_from: null,
      date_to: null,
      events: [DEMO_EVENT_23],
    });
    expect(data?.academic_year_id).toBe(1);
    expect(data?.events).toHaveLength(1);
    expect(data?.events[0].id).toBe(23);
  });
});

describe('normalizeAcademicCalendarClosureContext', () => {
  it('parses live closure-context for confirmed morning closure', () => {
    const ctx = normalizeAcademicCalendarClosureContext({
      date: '2026-12-15',
      is_closed: true,
      is_closed_confirmed: true,
      provisional_only: false,
      includes_provisional: false,
      closure_kind: 'partial',
      day_part: 'morning',
      status: 'confirmed',
      calendar_id: 20,
      scope_applied: { cycle_id: null, level_id: null, class_id: null },
      causing_event: {
        id: 24,
        name: 'إغلاق استثنائي للمؤسسة',
        event_type: 'school_closure',
        date_from: '2026-12-15',
        date_to: '2026-12-15',
        day_part: 'morning',
        status: 'confirmed',
        scope_type: 'school',
        cycle: null,
        level: null,
        class: null,
        is_school_closed: true,
        blocks_timetable: true,
        blocks_attendance: true,
        blocks_exams: true,
        affects_services: true,
        source_type: 'school_local',
        source_reference: null,
        is_local_override: false,
        notes: null,
        sequence: 10,
        active: true,
      },
      events: [],
      warnings: [],
    });
    expect(ctx).toMatchObject({
      date: '2026-12-15',
      is_closed: true,
      closure_kind: 'partial',
      day_part: 'morning',
      causing_event: { id: 24 },
    });
  });
});

describe('unwrapAcademicCalendarMutationData', () => {
  it('unwraps update-event envelope { event, calendar }', () => {
    const detail = unwrapAcademicCalendarMutationData({
      event: {
        id: 24,
        name: 'إغلاق استثنائي للمؤسسة',
        event_type: 'school_closure',
        date_from: '2026-12-15',
        date_to: '2026-12-15',
        day_part: 'morning',
        time_from: 8.5,
        time_to: 13.25,
        status: 'confirmed',
        scope_type: 'school',
        cycle: null,
        level: null,
        class: null,
        is_school_closed: true,
        blocks_timetable: true,
        blocks_attendance: true,
        blocks_exams: true,
        affects_services: true,
        source_type: 'school_local',
        source_reference: null,
        is_local_override: false,
        notes: null,
        sequence: 10,
        active: true,
      },
      calendar: DEMO_LIST_ROW,
    });
    expect(detail?.id).toBe(20);
    expect(detail?.updated_event).toMatchObject({
      id: 24,
      time_from: '08:30',
      time_to: '13:15',
    });
  });
});
