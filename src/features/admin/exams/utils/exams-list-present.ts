/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const EXAMS_PAGE_SIZE = 20;

export const EXAM_LIST_STATES = [
  'draft',
  'published',
  'done',
  'cancelled',
  'archived',
] as const;

export type ExamListState = (typeof EXAM_LIST_STATES)[number];

export type ExamsListEmptyVariant = 'no-data' | 'no-match';

export function examsListHasActiveQuery(options: {
  classId?: string;
  stateFilter?: string;
}): boolean {
  return !!(options.classId || options.stateFilter);
}

export function resolveExamsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ExamsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatExamListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}

export function formatExamListType(
  label: string | null | undefined,
  type: string | null | undefined,
  emptyLabel: string,
): string {
  const preferred = label?.trim() || type?.trim();
  return preferred || emptyLabel;
}

export function formatExamListSchedule(
  examDate: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): { dateLabel: string; timeLabel: string | null } {
  const dateLabel = formatExamListDate(examDate, formatDate, emptyLabel);
  const start = startTime?.trim() || '';
  const end = endTime?.trim() || '';
  if (!start && !end) return { dateLabel, timeLabel: null };
  if (start && end) return { dateLabel, timeLabel: `${start} – ${end}` };
  return { dateLabel, timeLabel: start || end };
}
