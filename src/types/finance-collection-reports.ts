/**
 * ODOO_FINANCE_COLLECTION_REPORTS_CONTRACT_1A
 * Endpoints:
 *   GET /admin/finance/reports/collections
 *   GET /admin/finance/reports/collections/aggregations
 * Capability: finance.view_payments
 */

export type CollectionReportRowKind = 'allocation' | 'unallocated_remainder';

export type CollectionReportPaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'card_terminal'
  | 'other';

export interface CollectionReportNamedRef {
  id: number | string | null;
  display_name?: string | null;
  code?: string | null;
  category?: string | null;
}

export interface CollectionReportPayer {
  billing_partner_id?: number | null;
  display_name?: string | null;
  actual_payer_name?: string | null;
}

export interface CollectionReportStudent {
  id: number;
  display_name?: string | null;
  code?: string | null;
}

export interface CollectionReportSummary {
  currency_id?: number | null;
  currency_name?: string | null;
  total_confirmed_collections_amount: number;
  collections_count: number;
  distinct_payers_count?: number;
  allocated_amount: number;
  unallocated_amount: number;
  scoped_allocated_amount?: number;
  distinct_students_count?: number;
  allocations_count?: number;
  academic_filters_active?: boolean;
}

export interface CollectionReportDetailRow {
  row_kind: CollectionReportRowKind;
  collection_id: number;
  allocation_id?: number | null;
  collection_reference?: string | null;
  receipt_number?: string | null;
  receipt_id?: number | null;
  payment_date?: string | null;
  confirmed_at?: string | null;
  payer?: CollectionReportPayer | null;
  student?: CollectionReportStudent | null;
  cycle?: CollectionReportNamedRef | null;
  level?: CollectionReportNamedRef | null;
  class?: CollectionReportNamedRef | null;
  service?: CollectionReportNamedRef | null;
  payment_method?: string | null;
  allocated_amount: number;
  collection_amount?: number;
  collection_amount_summable?: boolean;
  allocation_status?: string | null;
  allocation_state?: string | null;
  settlement_state?: string | null;
  reversed_or_cancelled?: boolean;
  currency_id?: number | null;
  is_unallocated?: boolean;
}

export interface CollectionReportAggregationRow {
  id: number | string | null;
  display_name?: string | null;
  allocated_amount?: number;
  /** Present on by_payment_method — collection.amount summed once. */
  collections_amount?: number;
  allocations_count?: number;
  collections_count?: number;
  distinct_students_count?: number;
  distinct_payers_count?: number;
  code?: string | null;
  category?: string | null;
}

export interface CollectionReportAggregations {
  by_cycle: CollectionReportAggregationRow[];
  by_level: CollectionReportAggregationRow[];
  by_class: CollectionReportAggregationRow[];
  by_service: CollectionReportAggregationRow[];
  by_payment_method: CollectionReportAggregationRow[];
}

export interface CollectionReportAppliedFilters {
  school_id?: number;
  date?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  academic_year_id?: number | null;
  payment_method?: string | null;
  cycle?: string | null;
  level_id?: number | null;
  class_id?: number | null;
  service_id?: number | null;
  billing_partner_id?: number | null;
  student_id?: number | null;
  cashier_id?: number | null;
  search?: string | null;
  state?: string | null;
}

export interface CollectionReportSemantics {
  business_date_field?: string;
  timezone_policy?: string;
  confirmed_collection_state?: string;
  excluded_collection_states?: string[];
  allocation_metric_basis?: string;
  academic_relation_basis?: string;
  academic_snapshot_on_collection?: boolean;
  unallocated_never_attributed_to_academic_dims?: boolean;
  collection_total_not_repeated_per_allocation?: boolean;
}

export interface CollectionReportsDetailsPayload {
  items: CollectionReportDetailRow[];
  summary: CollectionReportSummary;
  applied_filters?: CollectionReportAppliedFilters;
  semantics?: CollectionReportSemantics;
}

export interface CollectionReportsAggregationsPayload {
  summary: CollectionReportSummary;
  aggregations: CollectionReportAggregations;
  applied_filters?: CollectionReportAppliedFilters;
  semantics?: CollectionReportSemantics;
}

export type CollectionReportAggDimension =
  | 'cycle'
  | 'level'
  | 'class'
  | 'service'
  | 'payment_method';
