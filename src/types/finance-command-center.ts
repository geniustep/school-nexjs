import type { FinanceInstallment, FinanceInstallmentListSummary } from './finance';

export interface FinanceCommandCenterCurrency {
  id: number;
  name: string;
  symbol?: string | null;
  decimal_places?: number | null;
}

export interface FinanceCommandCenterMeta {
  school_id: number;
  academic_year_id: number;
  as_of_date: string;
  date_from?: string | null;
  date_to?: string | null;
  currency?: FinanceCommandCenterCurrency | null;
  generated_at?: string | null;
  historical_as_of_supported: boolean;
}

export interface FinanceCommandCenterAvailability {
  available: boolean;
  reason_code?: string | null;
}

export type FinanceCommandCenterMetricKey =
  | 'due_to_date'
  | 'recognized_collected_to_date'
  | 'collection_rate_to_date'
  | 'overdue'
  | 'aging'
  | 'collection_performance';

export interface FinanceCommandCenterDrilldownTarget {
  endpoint: string;
  query: Record<string, string | number | null | undefined>;
}

export interface FinanceCommandCenterSummary extends Record<string, unknown> {
  meta: FinanceCommandCenterMeta;
  kpis: {
    due_to_date: {
      amount: number;
      installments_count: number;
      drilldown?: FinanceCommandCenterDrilldownTarget | null;
    };
    recognized_collected_to_date: FinanceCommandCenterAvailability & {
      amount?: number | null;
      operational_settled_amount?: number | null;
      historical_unattributed_amount?: number | null;
      basis?: string | null;
      drilldown?: FinanceCommandCenterDrilldownTarget | null;
    };
    collection_rate_to_date: FinanceCommandCenterAvailability & {
      value?: number | null;
      numerator?: number | null;
      denominator?: number | null;
      formula?: string | null;
      drilldown?: FinanceCommandCenterDrilldownTarget | null;
    };
    overdue: FinanceCommandCenterAvailability & {
      amount?: number | null;
      operational_balance_amount?: number | null;
      historical_unattributed_amount?: number | null;
      installments_count: number;
      billing_accounts_count: number;
      students_count: number;
      drilldown?: FinanceCommandCenterDrilldownTarget | null;
    };
  };
  explain?: {
    endpoint?: string | null;
    query_keys?: string[];
  };
  unavailable_metrics: {
    available_liquidity: FinanceCommandCenterAvailability;
    expected_liquidity_30d: FinanceCommandCenterAvailability;
  };
  data_quality?: {
    historical_settlement_attribution_complete?: boolean;
    historical_unattributed_amount?: number | null;
    overdue_historical_unattributed_amount?: number | null;
  };
}

export interface FinanceCommandCenterPerformanceItem {
  period: string;
  due_amount: number;
  recognized_collected_amount?: number | null;
  operational_settled_amount?: number | null;
  remaining_amount?: number | null;
  operational_remaining_amount?: number | null;
  overdue_amount?: number | null;
  operational_overdue_amount?: number | null;
  collection_rate?: number | null;
  reason_code?: string | null;
  installments_count: number;
  billing_accounts_count: number;
  students_count: number;
  drilldown?: FinanceCommandCenterDrilldownTarget | null;
}

export interface FinanceCommandCenterPerformance {
  meta: FinanceCommandCenterMeta;
  items: FinanceCommandCenterPerformanceItem[];
  data_quality?: {
    historical_settlement_attribution_complete?: boolean;
    historical_unattributed_amount?: number | null;
  };
}

export type FinanceCommandCenterAgingKey =
  | 'current'
  | '1_30'
  | '31_60'
  | '61_90'
  | '90_plus';

export interface FinanceCommandCenterAgingItem {
  key: FinanceCommandCenterAgingKey;
  label: string;
  amount?: number | null;
  operational_balance_amount?: number | null;
  installments_count: number;
  billing_accounts_count: number;
  students_count: number;
  percentage_of_overdue?: number | null;
  reason_code?: string | null;
  drilldown?: FinanceCommandCenterDrilldownTarget | null;
}

export interface FinanceCommandCenterAging {
  meta: FinanceCommandCenterMeta;
  summary: FinanceCommandCenterAvailability & {
    outstanding_amount?: number | null;
    operational_outstanding_amount?: number | null;
    overdue_amount?: number | null;
    operational_overdue_amount?: number | null;
    historical_unattributed_amount?: number | null;
    outstanding_installments_count: number;
    overdue_installments_count: number;
  };
  items: FinanceCommandCenterAgingItem[];
}

export type FinanceCommandCenterAttentionSeverity = 'high' | 'medium' | 'info' | string;

export interface FinanceCommandCenterAttentionItem {
  type: string;
  severity: FinanceCommandCenterAttentionSeverity;
  count?: number | null;
  amount?: number | null;
  reason_code: string;
  action_path?: string | null;
  drilldown?: FinanceCommandCenterDrilldownTarget | null;
}

export interface FinanceCommandCenterAttention {
  meta: FinanceCommandCenterMeta;
  items: FinanceCommandCenterAttentionItem[];
  visibility?: {
    collections_integrity?: boolean;
    cheques?: boolean;
    cash_variance?: boolean;
    cash_variance_reason?: string | null;
  };
}

export interface FinanceCommandCenterDrilldown {
  meta?: FinanceCommandCenterMeta | null;
  items: FinanceInstallment[];
  summary: FinanceInstallmentListSummary;
  applied_filters?: Record<string, unknown>;
  drilldown?: FinanceCommandCenterDrilldownTarget | null;
}

export interface FinanceCommandCenterExplain {
  meta: FinanceCommandCenterMeta;
  metric_key: FinanceCommandCenterMetricKey;
  aging_bucket?: FinanceCommandCenterAgingKey | null;
  period?: string | null;
  currency?: FinanceCommandCenterCurrency | null;
  record_count: number;
  filters?: Record<string, unknown>;
  data_quality_status: string;
  reason_codes?: string[];
  excluded_or_unattributed_amount?: number | null;
  drilldown_target?: FinanceCommandCenterDrilldownTarget | null;
  explain_endpoint?: string | null;
  value?: number | {
    due_amount: number;
    recognized_collected_amount?: number | null;
    collection_rate?: number | null;
  } | null;
  operational_value?: number | null;
  definition?: string | null;
  formula?: string | null;
  numerator?: number | null;
  denominator?: number | null;
}
