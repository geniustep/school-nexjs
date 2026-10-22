/** Canonical finance readings supplied by the financial API. */
export const FINANCE_CANONICAL_KEYS = [
  'academic_year_programmed_total',
  'due_to_date',
  'recognized_collected_to_date',
  'remaining_due_to_date',
  'overdue_amount',
  'future_scheduled_amount',
  'collection_rate_to_date',
] as const;

export type FinanceCanonicalKey = (typeof FINANCE_CANONICAL_KEYS)[number];
export type FinanceCanonicalValues = Record<FinanceCanonicalKey, number | null> & Partial<Record<FinanceCanonicalExtraKey, number | null>>;

export type FinanceCanonicalMetrics = {
  meta: {
    school_id: number;
    academic_year_id: number;
    as_of_date: string;
    scope_basis?: string | null;
    currency?: { name?: string; symbol?: string | null; decimal_places?: number | null } | null;
  };
  values: FinanceCanonicalValues;
  availability: Partial<Record<FinanceCanonicalKey | FinanceCanonicalExtraKey, { available: boolean; reason_code?: string | null }>>;
  data_quality?: {
    historical_settlement_attribution_complete?: boolean;
    historical_unattributed_amount?: number | null;
    overdue_attribution_complete?: boolean;
  };
  /** Never used as a visual fallback for unavailable authoritative amounts. */
  operational_values?: Partial<FinanceCanonicalValues>;
  semantics?: { scope_notes?: string[] };
  legacy_reconciliation?: { fee_net_total_assessed?: number; fee_net_total_note?: string };
};

/** Additive metrics: omitted by old nibras runtimes. */
export const FINANCE_CANONICAL_EXTRA_KEYS = [
  'stock_fee_paid', 'remaining_balance', 'future_due_paid',
] as const;
export type FinanceCanonicalExtraKey = (typeof FINANCE_CANONICAL_EXTRA_KEYS)[number];

export const FINANCE_CANONICAL_PERIOD_KEYS = [
  'period_cash_collected', 'all_confirmed_collections',
  'period_due_cohort_due', 'period_due_cohort_paid',
  'period_due_cohort_collection_rate',
] as const;
export type FinanceCanonicalPeriodKey = (typeof FINANCE_CANONICAL_PERIOD_KEYS)[number];

export type FinanceCanonicalPeriodMetrics = {
  meta: {
    school_id: number;
    academic_year_id: number;
    date_from: string;
    date_to: string;
    as_of_date: string;
    currency?: { name?: string; symbol?: string | null; decimal_places?: number | null } | null;
  };
  values: Record<FinanceCanonicalPeriodKey, number | null>;
  semantics?: Record<string, unknown>;
  collections_reconciliation?: {
    only_in_all_confirmed_count?: number;
    only_in_all_confirmed_amount?: number;
    exclusion_reasons?: string[];
  };
};
