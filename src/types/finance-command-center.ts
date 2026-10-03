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

export interface FinanceCommandCenterSummary extends Record<string, unknown> {
  meta: FinanceCommandCenterMeta;
  kpis: {
    due_to_date: {
      amount: number;
      installments_count: number;
    };
    recognized_collected_to_date: FinanceCommandCenterAvailability & {
      amount?: number | null;
      operational_settled_amount?: number | null;
      historical_unattributed_amount?: number | null;
      basis?: string | null;
    };
    collection_rate_to_date: FinanceCommandCenterAvailability & {
      value?: number | null;
      numerator?: number | null;
      denominator?: number | null;
    };
    overdue: FinanceCommandCenterAvailability & {
      amount?: number | null;
      operational_balance_amount?: number | null;
      historical_unattributed_amount?: number | null;
      installments_count: number;
      billing_accounts_count: number;
      students_count: number;
    };
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
