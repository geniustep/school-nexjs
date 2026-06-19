export interface AgreementFinancialSummary {
  original_total?: number;
  discount_total?: number;
  surcharge_total?: number;
  net_total?: number;
  final_total?: number;
  one_time_total?: number;
  recurring_total_after_discount?: number;
  monthly_due_amount?: number;
  schedule_total?: number;
  paid_amount?: number;
  remaining_amount?: number;
}

export interface AgreementCustomizationPeriod {
  period_key?: string;
  label?: string;
  selected?: boolean;
}

export interface AgreementCustomization {
  kind?: string;
  scope?: string;
  discount_type?: string;
  discount_value?: number;
  reason?: string;
  line_id?: number;
  line_name?: string;
  original_amount?: number;
  final_amount?: number;
  selected?: boolean;
  due_date_override?: string | null;
  periods?: AgreementCustomizationPeriod[];
}

export type AgreementFinanceSummarySource = {
  financial_summary?: AgreementFinancialSummary | null;
  draft_totals?: AgreementFinancialSummary | null;
  original_total?: number;
  discount_total?: number;
  surcharge_total?: number;
  net_total?: number;
  net_amount?: number;
  gross_amount?: number;
  discount_amount?: number;
  total_amount?: number;
};
