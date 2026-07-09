/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const EXAM_RESULTS_PAGE_SIZE = 20;

export const EXAM_RESULT_LIST_STATES = ['draft', 'published', 'archived'] as const;

export type ExamResultListState = (typeof EXAM_RESULT_LIST_STATES)[number];

export type ExamResultsListEmptyVariant = 'no-data' | 'no-match';

export function examResultsListHasActiveQuery(options: {
  classId?: string;
  stateFilter?: string;
}): boolean {
  return !!(options.classId || options.stateFilter);
}

export function resolveExamResultsListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ExamResultsListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatExamResultListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}

export function formatExamResultScore(
  score: number | null | undefined,
  maxScore: number | null | undefined,
  emptyLabel: string,
): string {
  if (score == null || Number.isNaN(score) || score < 0) return emptyLabel;
  if (maxScore == null || Number.isNaN(maxScore)) return String(score);
  return `${score}/${maxScore}`;
}
