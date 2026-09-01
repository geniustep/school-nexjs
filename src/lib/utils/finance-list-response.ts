import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { FinanceInstallmentServiceFacet } from '@/types/finance';

export type FinanceListSummary = {
  total_count?: number;
  total_amount?: number;
  total_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
};

export type FinanceAppliedFilters = Record<string, unknown>;

export type FinanceQuickListResult<T> = {
  items: T[];
  summary: FinanceListSummary | null;
  appliedFilters: FinanceAppliedFilters | null;
  serviceFacets: FinanceInstallmentServiceFacet[];
};

function isInstallmentServiceFacet(value: unknown): value is FinanceInstallmentServiceFacet {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.service_id === 'number' &&
    typeof row.service_name === 'string' &&
    typeof row.count === 'number' &&
    typeof row.total_remaining === 'number' &&
    typeof row.total_overdue === 'number'
  );
}

/** Normalize cheques/installments list payloads — array without quick, object with quick. */
export function parseFinanceQuickListResponse<T>(data: unknown): FinanceQuickListResult<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], summary: null, appliedFilters: null, serviceFacets: [] };
  }
  if (!data || typeof data !== 'object') {
    return { items: [], summary: null, appliedFilters: null, serviceFacets: [] };
  }
  const row = data as Record<string, unknown>;
  const items = parseFinanceList<T>(row.items ?? row);
  const summary =
    row.summary && typeof row.summary === 'object' ? (row.summary as FinanceListSummary) : null;
  const appliedFilters =
    row.applied_filters && typeof row.applied_filters === 'object'
      ? (row.applied_filters as FinanceAppliedFilters)
      : null;
  const serviceFacets = Array.isArray(row.service_facets)
    ? row.service_facets.filter(isInstallmentServiceFacet)
    : [];
  return { items, summary, appliedFilters, serviceFacets };
}
