import type { AcademicCalendarEvent, AcademicCalendarSummary } from '@/types/academic-calendar';

export const ACADEMIC_CALENDARS_PAGE_SIZE = 20;

export const ACADEMIC_CALENDAR_EVENT_TYPE_OPTIONS = [
  'inter_term_break',
  'national_holiday',
  'school_closure',
  'mid_year_break',
  'religious_holiday',
] as const;

export const ACADEMIC_CALENDAR_DAY_PART_OPTIONS = ['full_day', 'morning', 'afternoon'] as const;

export function academicCalendarsListHasActiveQuery(query: {
  yearId?: string;
  stateFilter?: string;
  search?: string;
}): boolean {
  return Boolean(query.yearId || query.stateFilter || query.search?.trim());
}

export function resolveAcademicCalendarsListEmptyVariant(input: {
  hasActiveQuery: boolean;
}): 'no-data' | 'no-match' {
  return input.hasActiveQuery ? 'no-match' : 'no-data';
}

export function filterAcademicCalendarsClient(
  rows: AcademicCalendarSummary[],
  query: { search?: string },
): AcademicCalendarSummary[] {
  const search = query.search?.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => {
    const hay = `${row.name} ${row.academic_year_name ?? ''} ${row.state}`.toLowerCase();
    return hay.includes(search);
  });
}

export function academicCalendarEventTypeLabelKey(eventType: string): string {
  return `admin.academicCalendars.eventTypes.${eventType}`;
}

export function academicCalendarScopeLabelKey(scopeType: string): string {
  return `admin.academicCalendars.scopeTypes.${scopeType}`;
}

export function academicCalendarDayPartLabelKey(dayPart: string): string {
  return `admin.academicCalendars.dayParts.${dayPart}`;
}

export function academicCalendarClosureKindLabelKey(kind: string): string {
  return `admin.academicCalendars.closureKinds.${kind}`;
}

export function mergeCalendarEventsForDisplay(
  detailEvents: AcademicCalendarEvent[] | undefined,
  provisionalEvents: AcademicCalendarEvent[] | undefined,
): AcademicCalendarEvent[] {
  const byId = new Map<number, AcademicCalendarEvent>();
  for (const event of detailEvents ?? []) byId.set(event.id, event);
  for (const event of provisionalEvents ?? []) {
    const existing = byId.get(event.id);
    if (existing) {
      byId.set(event.id, { ...existing, ...event, status: event.status || existing.status });
    } else {
      byId.set(event.id, event);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const left = a.date_from || '';
    const right = b.date_from || '';
    return left.localeCompare(right) || a.id - b.id;
  });
}

export function suggestDuplicateCalendarName(sourceName: string): string {
  const trimmed = sourceName.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('نسخة من ')) return trimmed;
  return `نسخة من ${trimmed}`;
}

export function academicCalendarEventIsProvisional(event: AcademicCalendarEvent): boolean {
  return event.status === 'provisional';
}

/** Compact backend impact flags for display — no invented impact enum. */
export function academicCalendarEventImpactFlags(
  event: Pick<
    AcademicCalendarEvent,
    | 'is_school_closed'
    | 'blocks_timetable'
    | 'blocks_attendance'
    | 'blocks_exams'
    | 'affects_services'
    | 'day_part'
  >,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  if (event.day_part) {
    const key = academicCalendarDayPartLabelKey(event.day_part);
    const label = t(key);
    parts.push(label !== key ? label : event.day_part);
  }
  if (event.is_school_closed) parts.push(t('admin.academicCalendars.impactFlags.schoolClosed'));
  if (event.blocks_timetable) parts.push(t('admin.academicCalendars.impactFlags.blocksTimetable'));
  if (event.blocks_attendance) parts.push(t('admin.academicCalendars.impactFlags.blocksAttendance'));
  if (event.blocks_exams) parts.push(t('admin.academicCalendars.impactFlags.blocksExams'));
  if (event.affects_services) parts.push(t('admin.academicCalendars.impactFlags.affectsServices'));
  return parts.join(' · ');
}

export function defaultClosureQueryDate(calendar: {
  effective_from?: string | null;
  events?: AcademicCalendarEvent[];
}): string {
  const firstEvent = calendar.events?.[0]?.date_from;
  if (firstEvent) return firstEvent;
  if (calendar.effective_from) return calendar.effective_from;
  return new Date().toISOString().slice(0, 10);
}
