export const GRADEBOOKS_PAGE_SIZE = 20;

export const GRADEBOOK_LIST_STATES = [
  'draft',
  'open',
  'submitted',
  'validated',
  'published',
  'locked',
] as const;

export function gradebooksListHasActiveQuery(filters: {
  academicYearId?: string;
  termId?: string;
  classId?: string;
  subjectId?: string;
  stateFilter?: string;
}): boolean {
  return Boolean(
    filters.academicYearId ||
      filters.termId ||
      filters.classId ||
      filters.subjectId ||
      filters.stateFilter,
  );
}

export function resolveGradebooksListEmptyVariant({
  hasActiveQuery,
}: {
  hasActiveQuery: boolean;
}): 'no-data' | 'no-match' {
  return hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatCompletionPercent(value: number | null | undefined, dash: string): string {
  if (value == null || Number.isNaN(value)) return dash;
  return `${Math.round(value)}%`;
}

export function formatCompletionSummary(
  percent: number | null | undefined,
  unresolved: number | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const pct = formatCompletionPercent(percent, '—');
  if (unresolved == null) return t('admin.gradebooks.completion.summaryPercent', { percent: pct });
  return t('admin.gradebooks.completion.summaryWithRemaining', {
    percent: pct,
    remaining: unresolved,
  });
}
