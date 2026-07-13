/**
 * Document status presentation for print — text-first, never color-only.
 */

export type PrintDocumentKind =
  | 'distribution'
  | 'reference_jathatha'
  | 'teacher_jathatha'
  | 'actual_delivery'
  | 'class_journal'
  | 'teaching_progress';

export function isDraftLikeState(state: string | null | undefined): boolean {
  return state === 'draft';
}

export function printStatusTone(
  state: string | null | undefined,
): 'draft' | 'voided' | 'superseded' | 'default' {
  if (state === 'draft') return 'draft';
  if (state === 'voided') return 'voided';
  if (state === 'superseded') return 'superseded';
  return 'default';
}

/** Build filter query for report print routes (preserve known keys only). */
export function buildPrintReportQuery(
  filters: Record<string, string | number | boolean | null | undefined>,
  scope: 'current_page' | 'all_filtered',
  page?: number,
): string {
  const params = new URLSearchParams();
  params.set('print_scope', scope);
  if (scope === 'current_page' && page != null) {
    params.set('page', String(page));
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === '' || value === false) continue;
    if (key === 'print_scope' || key === 'page') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function parsePrintScope(
  value: string | null | undefined,
): 'current_page' | 'all_filtered' {
  return value === 'current_page' ? 'current_page' : 'all_filtered';
}

export function dash(value: string | number | null | undefined, fallback = '—'): string {
  if (value == null || value === '') return fallback;
  return String(value);
}

export function named(ref: { name?: string | null } | null | undefined, fallback = '—'): string {
  return ref?.name?.trim() || fallback;
}
