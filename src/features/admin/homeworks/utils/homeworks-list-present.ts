/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const HOMEWORKS_PAGE_SIZE = 20;

export const HOMEWORK_LIST_STATES = ['draft', 'published', 'closed', 'archived'] as const;

export type HomeworkListState = (typeof HOMEWORK_LIST_STATES)[number];

export type HomeworksListEmptyVariant = 'no-data' | 'no-match';

export function homeworksListHasActiveQuery(options: {
  search?: string;
  classId?: string;
  stateFilter?: string;
}): boolean {
  return !!(options.search?.trim() || options.classId || options.stateFilter);
}

export function resolveHomeworksListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): HomeworksListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatHomeworkListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}
