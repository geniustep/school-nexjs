// Student 360 finance summary — GET /admin/students/{id}/finance/summary

export interface StudentFinanceCurrency {
  name: string;
  symbol: string;
  position?: 'before' | 'after' | string;
}

export interface StudentFinanceSummaryTotals {
  currency: StudentFinanceCurrency;
  total_assessed: number;
  total_discount: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  next_due_date: string | null;
}

export interface StudentBillingProfileSummary {
  id: number;
  state?: string | null;
  billing_party_type?: string | null;
  guardian_id?: number | null;
  billing_partner_id?: number | null;
  billing_partner_name?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface StudentFinancialResponsible {
  guardian_id?: number | null;
  relationship_id?: number | null;
  name?: string | null;
}

export interface StudentFinanceCapabilities {
  can_view: boolean;
  can_view_payments: boolean;
  can_collect: boolean;
  can_assign_fees: boolean;
  can_manage_discounts: boolean;
  can_approve_discounts: boolean;
  can_view_billing_profile: boolean;
  can_manage_billing_profile: boolean;
}

export interface StudentFinanceConsistency {
  financial_responsible_matches_billing_profile?: boolean;
}

export interface StudentFinanceSummaryData {
  academic_year: { id: number; name: string; code?: string | null };
  summary: StudentFinanceSummaryTotals;
  billing_profile: StudentBillingProfileSummary | null;
  financial_responsible: StudentFinancialResponsible | null;
  capabilities: StudentFinanceCapabilities;
  consistency?: StudentFinanceConsistency | null;
}

/** Lightweight summary on GET /admin/students/{id} for Overview only. */
export interface StudentFinanceOverviewSummary {
  currency: StudentFinanceCurrency;
  total_assessed: number;
  total_discount: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  next_due_date: string | null;
}
