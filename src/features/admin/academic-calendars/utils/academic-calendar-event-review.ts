import type { AcademicCalendarEvent } from '@/types/academic-calendar';

export type AcademicCalendarReadingFilter = 'all' | 'holiday_closure' | 'milestone' | 'exam';

export interface AcademicCalendarDuplicateEventGroup {
  key: string;
  events: AcademicCalendarEvent[];
}

const HOLIDAY_OR_CLOSURE_TYPES = new Set([
  'national_holiday',
  'religious_holiday',
  'inter_term_break',
  'mid_year_break',
  'school_closure',
]);

const EXAM_NAME_PATTERN =
  /(امتحان|الامتحان|اختبار|فرض|المراقبة المستمرة|exam|examination|assessment|test|examen|évaluation|evaluation|contrôle|controle|prueba|evaluación|evaluacion)/i;

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function scopeKey(event: AcademicCalendarEvent): string {
  return [
    event.scope_type ?? '',
    event.cycle?.id ?? '',
    event.level?.id ?? '',
    event.class?.id ?? '',
  ].join(':');
}

export function academicCalendarEventAllowsMutation(event: AcademicCalendarEvent): boolean {
  return event.is_regulatory_locked !== true;
}

export function academicCalendarEventReadingFilter(
  event: AcademicCalendarEvent,
): Exclude<AcademicCalendarReadingFilter, 'all'> {
  if (HOLIDAY_OR_CLOSURE_TYPES.has(event.event_type)) return 'holiday_closure';

  // Backend currently exposes many exams and school-year milestones as `special_event`.
  // This is display-only grouping by the human-facing name; it never mutates or upgrades
  // the backend event type.
  if (EXAM_NAME_PATTERN.test(event.name ?? '')) return 'exam';

  return 'milestone';
}

export function academicCalendarEventMatchesReadingFilter(
  event: AcademicCalendarEvent,
  filter: AcademicCalendarReadingFilter,
): boolean {
  return filter === 'all' || academicCalendarEventReadingFilter(event) === filter;
}

export function academicCalendarDuplicateEventGroups(
  events: AcademicCalendarEvent[] | null | undefined,
): AcademicCalendarDuplicateEventGroup[] {
  const grouped = new Map<string, AcademicCalendarEvent[]>();

  for (const event of events ?? []) {
    if (event.active === false) continue;

    const key = [
      normalizeText(event.name),
      event.date_from ?? '',
      event.date_to ?? '',
      event.day_part ?? '',
      scopeKey(event),
    ].join('|');

    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => ({ key, events: bucket }))
    .sort((left, right) => {
      const leftDate = left.events[0]?.date_from ?? '';
      const rightDate = right.events[0]?.date_from ?? '';
      return leftDate.localeCompare(rightDate) || left.key.localeCompare(right.key);
    });
}
