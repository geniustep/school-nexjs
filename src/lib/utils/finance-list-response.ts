import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type {
  FinanceInstallmentAttention,
  FinanceInstallmentServiceFacet,
  FinanceInstallmentTimelinePoint,
} from '@/types/finance';

export type FinanceListSummary = {
  total_count?: number;
  beneficiary_count?: number;
  student_count?: number;
  total_amount?: number;
  total_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
  total_expected?: number;
  collection_rate?: number;
  average_due_per_beneficiary?: number;
  average_remaining_per_beneficiary?: number;
  average_overdue_per_beneficiary?: number;
  average_amount_per_student?: number;
  average_paid_per_student?: number;
  average_remaining_per_student?: number;
  average_overdue_per_student?: number;
};

export type FinanceAppliedFilters = Record<string, unknown>;

export type FinanceQuickListResult<T> = {
  items: T[];
  summary: FinanceListSummary | null;
  appliedFilters: FinanceAppliedFilters | null;
  serviceFacets: FinanceInstallmentServiceFacet[];
  timeline: FinanceInstallmentTimelinePoint[];
  attention: FinanceInstallmentAttention | null;
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

function isInstallmentTimelinePoint(value: unknown): value is FinanceInstallmentTimelinePoint {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.period === 'string' &&
    typeof row.installment_count === 'number' &&
    typeof row.total_amount === 'number' &&
    typeof row.total_paid === 'number' &&
    typeof row.total_remaining === 'number' &&
    typeof row.total_expected === 'number' &&
    typeof row.total_overdue === 'number' &&
    typeof row.collection_rate === 'number'
  );
}

/** Normalize cheques/installments list payloads — array without quick, object with quick. */
export function parseFinanceQuickListResponse<T>(data: unknown): FinanceQuickListResult<T> {
  if (Array.isArray(data)) {
    return {
      items: data as T[], summary: null, appliedFilters: null,
      serviceFacets: [], timeline: [], attention: null,
    };
  }
  if (!data || typeof data !== 'object') {
    return {
      items: [], summary: null, appliedFilters: null,
      serviceFacets: [], timeline: [], attention: null,
    };
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
  const timeline = Array.isArray(row.timeline)
    ? row.timeline.filter(isInstallmentTimelinePoint)
    : [];
  const attention =
    row.attention && typeof row.attention === 'object'
      ? (row.attention as FinanceInstallmentAttention)
      : null;
  return { items, summary, appliedFilters, serviceFacets, timeline, attention };
}
