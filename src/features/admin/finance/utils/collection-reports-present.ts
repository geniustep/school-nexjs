/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Pure presentation + query helpers for collection reports.
 * Does not compute financial totals — Backend remains the source of truth.
 */

import type { ListParams } from '@/types/api';
import type {
  CollectionReportAggDimension,
  CollectionReportAggregationRow,
  CollectionReportDetailRow,
  CollectionReportSummary,
  CollectionReportsAggregationsPayload,
  CollectionReportsDetailsPayload,
} from '@/types/finance-collection-reports';

export const COLLECTION_REPORTS_PAGE_SIZE = 50;

export const COLLECTION_REPORT_PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'cheque',
  'card_terminal',
  'other',
] as const;

export type CollectionReportsDateMode = 'day' | 'range';

export type CollectionReportsView = 'details' | 'aggregations';

export type CollectionReportsFilters = {
  dateMode: CollectionReportsDateMode;
  date: string;
  dateFrom: string;
  dateTo: string;
  cycle: string;
  levelId: string;
  classId: string;
  serviceId: string;
  paymentMethod: string;
  academicYearId: string;
  search: string;
  page: number;
  view: CollectionReportsView;
  aggDimension: CollectionReportAggDimension;
};

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultCollectionReportsFilters(now = new Date()): CollectionReportsFilters {
  return {
    dateMode: 'day',
    date: todayIsoDate(now),
    dateFrom: '',
    dateTo: '',
    cycle: '',
    levelId: '',
    classId: '',
    serviceId: '',
    paymentMethod: '',
    academicYearId: '',
    search: '',
    page: 1,
    view: 'details',
    aggDimension: 'cycle',
  };
}

export function isCollectionReportsView(value: string): value is CollectionReportsView {
  return value === 'details' || value === 'aggregations';
}

export function isCollectionReportAggDimension(
  value: string,
): value is CollectionReportAggDimension {
  return (
    value === 'cycle' ||
    value === 'level' ||
    value === 'class' ||
    value === 'service' ||
    value === 'payment_method'
  );
}

export function collectionReportsHasActiveQuery(
  filters: Pick<
    CollectionReportsFilters,
    | 'dateMode'
    | 'date'
    | 'dateFrom'
    | 'dateTo'
    | 'cycle'
    | 'levelId'
    | 'classId'
    | 'serviceId'
    | 'paymentMethod'
    | 'academicYearId'
    | 'search'
  >,
  defaults: Pick<CollectionReportsFilters, 'date'> = { date: todayIsoDate() },
): boolean {
  if (filters.search.trim()) return true;
  if (filters.cycle.trim()) return true;
  if (filters.levelId.trim()) return true;
  if (filters.classId.trim()) return true;
  if (filters.serviceId.trim()) return true;
  if (filters.paymentMethod.trim()) return true;
  if (filters.academicYearId.trim()) return true;
  if (filters.dateMode === 'range') {
    return Boolean(filters.dateFrom.trim() || filters.dateTo.trim());
  }
  return Boolean(filters.date.trim() && filters.date.trim() !== defaults.date);
}

export function resolveCollectionReportsEmptyVariant(input: {
  hasActiveQuery: boolean;
}): 'no-data' | 'no-match' {
  return input.hasActiveQuery ? 'no-match' : 'no-data';
}

/** Build query for Backend. Never sends school_id as client scope. */
export function buildCollectionReportsQuery(
  filters: CollectionReportsFilters,
): ListParams {
  const query: ListParams = {
    page: filters.page,
    page_size: COLLECTION_REPORTS_PAGE_SIZE,
  };

  if (filters.dateMode === 'day') {
    if (filters.date.trim()) query.date = filters.date.trim();
  } else {
    if (filters.dateFrom.trim()) query.date_from = filters.dateFrom.trim();
    if (filters.dateTo.trim()) query.date_to = filters.dateTo.trim();
  }

  if (filters.cycle.trim()) query.cycle = filters.cycle.trim();
  if (filters.levelId.trim()) query.level_id = Number(filters.levelId);
  if (filters.classId.trim()) query.class_id = Number(filters.classId);
  if (filters.serviceId.trim()) query.service_id = Number(filters.serviceId);
  if (filters.paymentMethod.trim()) query.payment_method = filters.paymentMethod.trim();
  if (filters.academicYearId.trim()) query.academic_year_id = Number(filters.academicYearId);
  if (filters.search.trim()) query.search = filters.search.trim();

  return query;
}

/** Aggregations share filters but do not paginate. */
export function buildCollectionReportsAggregationsQuery(
  filters: CollectionReportsFilters,
): ListParams {
  const { page: _page, page_size: _pageSize, ...rest } = buildCollectionReportsQuery(filters);
  return rest;
}

export function moneyOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNamedRef(value: unknown): CollectionReportDetailRow['cycle'] {
  const row = asRecord(value);
  if (!row) return null;
  const id = row.id;
  return {
    id: (typeof id === 'number' || typeof id === 'string' ? id : null) as number | string | null,
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    code: typeof row.code === 'string' ? row.code : null,
    category: typeof row.category === 'string' ? row.category : null,
  };
}

function asStudent(value: unknown): CollectionReportDetailRow['student'] {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'number') return null;
  return {
    id: row.id,
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    code: typeof row.code === 'string' ? row.code : null,
  };
}

function asPayer(value: unknown): CollectionReportDetailRow['payer'] {
  const row = asRecord(value);
  if (!row) return null;
  return {
    billing_partner_id: typeof row.billing_partner_id === 'number' ? row.billing_partner_id : null,
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    actual_payer_name: typeof row.actual_payer_name === 'string' ? row.actual_payer_name : null,
  };
}

export function normalizeCollectionReportSummary(raw: unknown): CollectionReportSummary | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    currency_id: typeof row.currency_id === 'number' ? row.currency_id : null,
    currency_name: typeof row.currency_name === 'string' ? row.currency_name : null,
    total_confirmed_collections_amount: moneyOrZero(row.total_confirmed_collections_amount),
    collections_count: moneyOrZero(row.collections_count),
    distinct_payers_count:
      row.distinct_payers_count == null ? undefined : moneyOrZero(row.distinct_payers_count),
    allocated_amount: moneyOrZero(row.allocated_amount),
    unallocated_amount: moneyOrZero(row.unallocated_amount),
    scoped_allocated_amount:
      row.scoped_allocated_amount == null ? undefined : moneyOrZero(row.scoped_allocated_amount),
    distinct_students_count:
      row.distinct_students_count == null ? undefined : moneyOrZero(row.distinct_students_count),
    allocations_count:
      row.allocations_count == null ? undefined : moneyOrZero(row.allocations_count),
    academic_filters_active: Boolean(row.academic_filters_active),
  };
}

export function normalizeCollectionReportDetailRow(raw: unknown): CollectionReportDetailRow | null {
  const row = asRecord(raw);
  if (!row || typeof row.collection_id !== 'number') return null;
  const kind =
    row.row_kind === 'unallocated_remainder' || row.is_unallocated
      ? 'unallocated_remainder'
      : 'allocation';
  return {
    row_kind: kind,
    collection_id: row.collection_id,
    allocation_id: typeof row.allocation_id === 'number' ? row.allocation_id : null,
    collection_reference:
      typeof row.collection_reference === 'string' ? row.collection_reference : null,
    receipt_number: typeof row.receipt_number === 'string' ? row.receipt_number : null,
    receipt_id: typeof row.receipt_id === 'number' ? row.receipt_id : null,
    payment_date: typeof row.payment_date === 'string' ? row.payment_date : null,
    confirmed_at: typeof row.confirmed_at === 'string' ? row.confirmed_at : null,
    payer: asPayer(row.payer),
    student: kind === 'unallocated_remainder' ? null : asStudent(row.student),
    cycle: kind === 'unallocated_remainder' ? null : asNamedRef(row.cycle),
    level: kind === 'unallocated_remainder' ? null : asNamedRef(row.level),
    class: kind === 'unallocated_remainder' ? null : asNamedRef(row.class),
    service: kind === 'unallocated_remainder' ? null : asNamedRef(row.service),
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : null,
    allocated_amount: moneyOrZero(row.allocated_amount),
    collection_amount:
      row.collection_amount == null ? undefined : moneyOrZero(row.collection_amount),
    collection_amount_summable: row.collection_amount_summable === true,
    allocation_status: typeof row.allocation_status === 'string' ? row.allocation_status : null,
    allocation_state: typeof row.allocation_state === 'string' ? row.allocation_state : null,
    settlement_state: typeof row.settlement_state === 'string' ? row.settlement_state : null,
    reversed_or_cancelled: Boolean(row.reversed_or_cancelled),
    currency_id: typeof row.currency_id === 'number' ? row.currency_id : null,
    is_unallocated: kind === 'unallocated_remainder',
  };
}

export function normalizeCollectionReportsDetailsPayload(
  raw: unknown,
): CollectionReportsDetailsPayload | null {
  const row = asRecord(raw);
  if (!row) return null;
  const summary = normalizeCollectionReportSummary(row.summary);
  if (!summary) return null;
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  return {
    items: itemsRaw
      .map(normalizeCollectionReportDetailRow)
      .filter((item): item is CollectionReportDetailRow => item != null),
    summary,
    applied_filters: asRecord(row.applied_filters) as CollectionReportsDetailsPayload['applied_filters'],
    semantics: asRecord(row.semantics) as CollectionReportsDetailsPayload['semantics'],
  };
}

function normalizeAggregationRow(raw: unknown): CollectionReportAggregationRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = row.id;
  return {
    id: typeof id === 'number' || typeof id === 'string' ? id : null,
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    allocated_amount: moneyOrZero(row.allocated_amount),
    collections_amount:
      row.collections_amount == null ? undefined : moneyOrZero(row.collections_amount),
    allocations_count:
      row.allocations_count == null ? undefined : moneyOrZero(row.allocations_count),
    collections_count:
      row.collections_count == null ? undefined : moneyOrZero(row.collections_count),
    distinct_students_count:
      row.distinct_students_count == null ? undefined : moneyOrZero(row.distinct_students_count),
    distinct_payers_count:
      row.distinct_payers_count == null ? undefined : moneyOrZero(row.distinct_payers_count),
    code: typeof row.code === 'string' ? row.code : null,
    category: typeof row.category === 'string' ? row.category : null,
  };
}

export function normalizeCollectionReportsAggregationsPayload(
  raw: unknown,
): CollectionReportsAggregationsPayload | null {
  const row = asRecord(raw);
  if (!row) return null;
  const summary = normalizeCollectionReportSummary(row.summary);
  if (!summary) return null;
  const aggs = asRecord(row.aggregations) ?? {};
  const list = (key: string) =>
    (Array.isArray(aggs[key]) ? aggs[key] : [])
      .map(normalizeAggregationRow)
      .filter((item): item is CollectionReportAggregationRow => item != null);

  return {
    summary,
    aggregations: {
      by_cycle: list('by_cycle'),
      by_level: list('by_level'),
      by_class: list('by_class'),
      by_service: list('by_service'),
      by_payment_method: list('by_payment_method'),
    },
    applied_filters: asRecord(row.applied_filters) as CollectionReportsAggregationsPayload['applied_filters'],
    semantics: asRecord(row.semantics) as CollectionReportsAggregationsPayload['semantics'],
  };
}

export function displayAmountForDetailRow(row: CollectionReportDetailRow): number {
  return moneyOrZero(row.allocated_amount);
}

export function isUnallocatedDetailRow(row: CollectionReportDetailRow): boolean {
  return row.row_kind === 'unallocated_remainder' || row.is_unallocated === true;
}

export function aggregationRowsForDimension(
  aggs: CollectionReportsAggregationsPayload['aggregations'] | null | undefined,
  dimension: CollectionReportAggDimension,
): CollectionReportAggregationRow[] {
  if (!aggs) return [];
  switch (dimension) {
    case 'cycle':
      return aggs.by_cycle;
    case 'level':
      return aggs.by_level;
    case 'class':
      return aggs.by_class;
    case 'service':
      return aggs.by_service;
    case 'payment_method':
      return aggs.by_payment_method;
    default:
      return [];
  }
}

export function drilldownFilterFromAggregation(
  dimension: CollectionReportAggDimension,
  row: CollectionReportAggregationRow,
): Partial<CollectionReportsFilters> {
  const id = row.id;
  switch (dimension) {
    case 'cycle':
      return { cycle: id == null ? '' : String(id), page: 1, view: 'details' };
    case 'level':
      return { levelId: id == null ? '' : String(id), page: 1, view: 'details' };
    case 'class':
      return { classId: id == null ? '' : String(id), page: 1, view: 'details' };
    case 'service':
      return { serviceId: id == null ? '' : String(id), page: 1, view: 'details' };
    case 'payment_method':
      return {
        paymentMethod: id == null ? '' : String(id),
        page: 1,
        view: 'details',
      };
    default:
      return { page: 1, view: 'details' };
  }
}

export function primaryAggregationAmount(
  dimension: CollectionReportAggDimension,
  row: CollectionReportAggregationRow,
): number {
  if (dimension === 'payment_method') {
    return moneyOrZero(row.collections_amount ?? row.allocated_amount);
  }
  return moneyOrZero(row.allocated_amount);
}
