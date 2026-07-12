import type {
  AcademicCalendarAllowedActions,
  AcademicCalendarClosureContext,
  AcademicCalendarClosureScopeApplied,
  AcademicCalendarDetail,
  AcademicCalendarEffectiveEventsData,
  AcademicCalendarEvent,
  AcademicCalendarLifecycleAction,
  AcademicCalendarRef,
  AcademicCalendarSummary,
  AcademicCalendarSummaryBlock,
  AcademicCalendarWarning,
  AcademicCalendarYearRef,
} from '@/types/academic-calendar';
import { normalizeAcademicCalendarTimeValue } from './academic-calendar-time';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeRef(raw: unknown): AcademicCalendarRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return { id: Number(record.id), name };
}

function normalizeYearRef(raw: unknown): AcademicCalendarYearRef | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;
  const name = asString(record.name)?.trim();
  if (!name) return null;
  return {
    id: Number(record.id),
    name,
    date_start: asString(record.date_start) ?? null,
    date_end: asString(record.date_end) ?? null,
  };
}

const KNOWN_ACTION_KEYS: AcademicCalendarLifecycleAction[] = [
  'view',
  'edit',
  'add_event',
  'edit_event',
  'delete_event',
  'submit_review',
  'reset_to_draft',
  'publish',
  'duplicate',
  'archive',
];

/** Strict boolean-map allowed_actions — no array coercion, no hyphen aliases. */
export function normalizeAcademicCalendarAllowedActions(
  raw: unknown,
): AcademicCalendarAllowedActions | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const map: AcademicCalendarAllowedActions = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'boolean') map[key] = value;
  }
  return map;
}

/** True only when API explicitly sets the exact action key to true. */
export function academicCalendarAllowsAction(
  source:
    | Pick<AcademicCalendarSummary, 'allowed_actions'>
    | AcademicCalendarAllowedActions
    | null
    | undefined,
  action: AcademicCalendarLifecycleAction | string,
): boolean {
  const actions =
    source && typeof source === 'object' && 'allowed_actions' in source
      ? source.allowed_actions
      : (source as AcademicCalendarAllowedActions | undefined);
  if (!actions) return false;
  return (actions as Record<string, boolean | undefined>)[action] === true;
}

export function normalizeAcademicCalendarWarning(raw: unknown): AcademicCalendarWarning | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { message: raw.trim(), severity: 'warning' };
  }
  const record = asRecord(raw);
  if (!record) return null;
  const message = asString(record.message)?.trim();
  if (!message) return null;
  return {
    code: asString(record.code),
    message,
    severity: asString(record.severity) ?? 'warning',
    field: asString(record.field),
  };
}

export function normalizeAcademicCalendarWarnings(raw: unknown): AcademicCalendarWarning[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeAcademicCalendarWarning)
    .filter((w): w is AcademicCalendarWarning => w != null);
}

export function normalizeAcademicCalendarSummaryBlock(
  raw: unknown,
): AcademicCalendarSummaryBlock | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    event_count: asNumber(record.event_count) ?? null,
    provisional_event_count: asNumber(record.provisional_event_count) ?? null,
    confirmed_event_count: asNumber(record.confirmed_event_count) ?? null,
    cancelled_event_count: asNumber(record.cancelled_event_count) ?? null,
    calendar_day_count: asNumber(record.calendar_day_count) ?? null,
    study_day_count: asNumber(record.study_day_count) ?? null,
    study_day_count_reliable: asBoolean(record.study_day_count_reliable) ?? null,
    warnings: normalizeAcademicCalendarWarnings(record.warnings),
  };
}

export function normalizeAcademicCalendarEvent(raw: unknown): AcademicCalendarEvent | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;

  const name = asString(record.name)?.trim();
  const eventType = asString(record.event_type)?.trim();
  const dateFrom = asString(record.date_from)?.trim();
  const dateTo = asString(record.date_to)?.trim();
  const status = asString(record.status)?.trim();
  if (!name || !eventType || !dateFrom || !dateTo || !status) return null;

  return {
    id: Number(record.id),
    name,
    event_type: eventType,
    date_from: dateFrom,
    date_to: dateTo,
    day_part: asString(record.day_part) ?? null,
    time_from: normalizeAcademicCalendarTimeValue(record.time_from),
    time_to: normalizeAcademicCalendarTimeValue(record.time_to),
    status,
    scope_type: asString(record.scope_type) ?? null,
    cycle: normalizeRef(record.cycle),
    level: normalizeRef(record.level),
    class: normalizeRef(record.class),
    is_school_closed: asBoolean(record.is_school_closed) ?? null,
    blocks_timetable: asBoolean(record.blocks_timetable) ?? null,
    blocks_attendance: asBoolean(record.blocks_attendance) ?? null,
    blocks_exams: asBoolean(record.blocks_exams) ?? null,
    affects_services: asBoolean(record.affects_services) ?? null,
    source_type: asString(record.source_type) ?? null,
    source_reference: asString(record.source_reference) ?? null,
    is_local_override: asBoolean(record.is_local_override) ?? null,
    notes: asString(record.notes) ?? null,
    sequence: asNumber(record.sequence) ?? null,
    active: asBoolean(record.active) ?? null,
  };
}

export function normalizeAcademicCalendarEvents(raw: unknown): AcademicCalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeAcademicCalendarEvent)
    .filter((event): event is AcademicCalendarEvent => event != null);
}

export function normalizeAcademicCalendarSummary(raw: unknown): AcademicCalendarSummary | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;

  const name = asString(record.name)?.trim();
  const state = asString(record.state)?.trim();
  if (!name || !state) return null;

  const school = normalizeRef(record.school);
  const academicYear = normalizeYearRef(record.academic_year);
  const summary = normalizeAcademicCalendarSummaryBlock(record.summary);
  const warnings = summary?.warnings?.length
    ? summary.warnings
    : normalizeAcademicCalendarWarnings(record.warnings);

  return {
    id: Number(record.id),
    name,
    display_name: asString(record.display_name) ?? null,
    state,
    version_number: asNumber(record.version_number) ?? null,
    school,
    school_id: school?.id ?? asNumber(record.school_id) ?? null,
    academic_year: academicYear,
    academic_year_id: academicYear?.id ?? asNumber(record.academic_year_id) ?? null,
    academic_year_name: academicYear?.name ?? null,
    effective_from: asString(record.effective_from) ?? null,
    effective_to: asString(record.effective_to) ?? null,
    source_type: asString(record.source_type) ?? null,
    source_reference: asString(record.source_reference) ?? null,
    published_at: asString(record.published_at) ?? null,
    summary,
    event_count: summary?.event_count ?? asNumber(record.event_count) ?? null,
    provisional_event_count:
      summary?.provisional_event_count ?? asNumber(record.provisional_event_count) ?? null,
    warnings,
    allowed_actions: normalizeAcademicCalendarAllowedActions(record.allowed_actions),
  };
}

export function normalizeAcademicCalendars(raw: unknown): AcademicCalendarSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeAcademicCalendarSummary)
    .filter((cal): cal is AcademicCalendarSummary => cal != null);
}

export function normalizeAcademicCalendarDetail(raw: unknown): AcademicCalendarDetail | null {
  const summary = normalizeAcademicCalendarSummary(raw);
  const record = asRecord(raw);
  if (!summary || !record) return null;

  return {
    ...summary,
    change_reason: asString(record.change_reason) ?? null,
    notes: asString(record.notes) ?? null,
    source_calendar: normalizeRef(record.source_calendar),
    published_by: normalizeRef(record.published_by),
    events: normalizeAcademicCalendarEvents(record.events),
    provisional_events: normalizeAcademicCalendarEvents(record.provisional_events),
    created_event: normalizeAcademicCalendarEvent(record.created_event),
    updated_event: normalizeAcademicCalendarEvent(record.event ?? record.updated_event),
  };
}

/**
 * Unwrap mutation envelopes:
 * - create/delete/duplicate/lifecycle/detail: calendar fields at data root (+ optional created_event)
 * - update event: `{ event, calendar }`
 */
export function unwrapAcademicCalendarMutationData(raw: unknown): AcademicCalendarDetail | null {
  const record = asRecord(raw);
  if (!record) return null;

  const nestedCalendar = asRecord(record.calendar);
  if (nestedCalendar) {
    const detail = normalizeAcademicCalendarDetail(nestedCalendar);
    if (!detail) return null;
    return {
      ...detail,
      created_event:
        normalizeAcademicCalendarEvent(record.created_event) ?? detail.created_event ?? null,
      updated_event:
        normalizeAcademicCalendarEvent(record.event ?? record.updated_event) ??
        detail.updated_event ??
        null,
    };
  }

  return normalizeAcademicCalendarDetail(raw);
}

function normalizeClosureScopeApplied(raw: unknown): AcademicCalendarClosureScopeApplied | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    cycle_id: asNumber(record.cycle_id) ?? null,
    level_id: asNumber(record.level_id) ?? null,
    class_id: asNumber(record.class_id) ?? null,
  };
}

export function normalizeAcademicCalendarClosureContext(
  raw: unknown,
): AcademicCalendarClosureContext | null {
  const record = asRecord(raw);
  if (!record) return null;
  const date = asString(record.date)?.trim();
  const isClosed = asBoolean(record.is_closed);
  if (!date || isClosed == null) return null;

  return {
    date,
    is_closed: isClosed,
    is_closed_confirmed: asBoolean(record.is_closed_confirmed) ?? false,
    provisional_only: asBoolean(record.provisional_only) ?? false,
    includes_provisional: asBoolean(record.includes_provisional) ?? false,
    closure_kind: asString(record.closure_kind)?.trim() || 'none',
    day_part: asString(record.day_part) ?? null,
    status: asString(record.status) ?? null,
    calendar_id: asNumber(record.calendar_id) ?? null,
    scope_applied: normalizeClosureScopeApplied(record.scope_applied),
    causing_event: normalizeAcademicCalendarEvent(record.causing_event),
    events: normalizeAcademicCalendarEvents(record.events),
    warnings: normalizeAcademicCalendarWarnings(record.warnings),
  };
}

export function normalizeAcademicCalendarEffectiveEvents(
  raw: unknown,
): AcademicCalendarEffectiveEventsData | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    academic_year_id: asNumber(record.academic_year_id) ?? null,
    school_id: asNumber(record.school_id) ?? null,
    date_from: asString(record.date_from) ?? null,
    date_to: asString(record.date_to) ?? null,
    events: normalizeAcademicCalendarEvents(record.events),
  };
}

export function isKnownAcademicCalendarAction(key: string): boolean {
  return KNOWN_ACTION_KEYS.includes(key as AcademicCalendarLifecycleAction);
}

/** Study-day count is only displayable when Backend marks it reliable. */
export function academicCalendarStudyDaysDisplay(
  summary: AcademicCalendarSummaryBlock | null | undefined,
): { value: number | null; reliable: boolean } {
  if (!summary) return { value: null, reliable: false };
  const reliable = summary.study_day_count_reliable === true;
  if (!reliable) return { value: null, reliable: false };
  return { value: summary.study_day_count, reliable: true };
}
