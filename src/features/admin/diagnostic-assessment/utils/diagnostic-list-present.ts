export function formatCompletionPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '0%';
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function formatAverageScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function diagnosticListHasActiveQuery(filters: {
  academicYearId?: string;
  classId?: string;
  subjectId?: string;
  stateFilter?: string;
}): boolean {
  return Boolean(
    filters.academicYearId || filters.classId || filters.subjectId || filters.stateFilter,
  );
}

export function resolveDiagnosticListEmptyVariant(params: {
  hasActiveQuery: boolean;
}): 'no-match' | 'no-data' {
  return params.hasActiveQuery ? 'no-match' : 'no-data';
}

export const DIAGNOSTIC_LIST_STATES = ['draft', 'confirmed'] as const;

export const DIAGNOSTIC_PAGE_SIZE = 20;
