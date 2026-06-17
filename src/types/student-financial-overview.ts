// Official student finance contracts — GET financial-overview, collectible-items, etc.

import type {
  StudentBillingProfileSummary,
  StudentFinanceCapabilities,
  StudentFinanceCurrency,
} from '@/types/student-finance';

export interface StudentFinancialOverviewTotals {
  currency: StudentFinanceCurrency;
  annual_total: number;
  due_to_date: number;
  paid: number;
  remaining: number;
  overdue: number;
  upcoming: number;
}

export interface StudentFinancialOverviewCounts {
  fees_count: number;
  installments_count: number;
}

export interface StudentFinancialOverviewNextInstallment {
  id: number;
  installment_id?: number;
  fee_name?: string | null;
  fee_type_name?: string | null;
  period_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  amount: number;
  paid_amount?: number;
  remaining_amount: number;
  due_date: string | null;
  state?: string | null;
  display_state?: string | null;
  timing_status?: string | null;
  payment_status?: string | null;
}

export interface AppliedFeePlanSummary {
  id: number;
  name: string;
  code?: string | null;
  academic_year?: { id: number; name: string; code?: string | null } | null;
  assigned_date?: string | null;
  total_fees: number;
  paid: number;
  remaining: number;
  fees_count: number;
  installments_count: number;
  state?: string | null;
}

export interface SpecialAgreementSummary {
  id: number;
  name?: string | null;
  state: string;
  net_amount?: number;
  empty_draft?: boolean;
  source?: string | null;
  line_count?: number;
  total_amount?: number;
}

export interface StudentFinancialOverview {
  academic_year: { id: number; name: string; code?: string | null };
  totals: StudentFinancialOverviewTotals;
  counts: StudentFinancialOverviewCounts;
  next_installment: StudentFinancialOverviewNextInstallment | null;
  applied_plans: AppliedFeePlanSummary[];
  special_agreement: SpecialAgreementSummary | null;
  billing_profile: StudentBillingProfileSummary | null;
  billing_profile_id?: number | null;
  capabilities?: StudentFinanceCapabilities;
}

export interface CollectibleItemsSummary {
  currency?: StudentFinanceCurrency;
  annual_total: number;
  due_to_date: number;
  paid: number;
  remaining: number;
  overdue: number;
  due_today?: number;
  upcoming: number;
}

export interface CollectibleItem {
  id: number;
  installment_id: number;
  student_fee_id?: number | null;
  fee_name?: string | null;
  fee_type_name?: string | null;
  display_label?: string | null;
  period_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  due_date?: string | null;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  state?: string | null;
  display_state?: string | null;
  timing_status?: string | null;
  payment_status?: string | null;
  selectable: boolean;
}

export interface CollectibleItemsResponse {
  academic_year_id?: number;
  billing_profile_id?: number | null;
  billing_partner_id?: number | null;
  billing_partner_name?: string | null;
  billing_party_type?: string | null;
  summary: CollectibleItemsSummary;
  items: CollectibleItem[];
}

export interface AssignedStudentFinancialSummary {
  student_id: number;
  student_name: string;
  registration_number?: string | null;
  level?: { id: number; name: string } | null;
  class?: { id: number; name: string } | null;
  assigned_date?: string | null;
  total_fees: number;
  due_to_date: number;
  paid: number;
  remaining: number;
  overdue: number;
  next_installment: StudentFinancialOverviewNextInstallment | null;
}

export interface AssignedStudentsFinancialSummaryResponse {
  students: AssignedStudentFinancialSummary[];
  pagination: { page: number; page_size: number; total: number };
}

export interface AgreementFromCurrentFeesPayload {
  academic_year_id: number;
  billing_profile_id?: number;
  fee_ids?: number[];
  title?: string;
}

export interface AgreementFromCurrentFeesResponse {
  agreement: {
    id: number;
    name?: string | null;
    state: string;
    net_amount?: number;
    academic_year?: { id: number; name: string } | null;
    empty_draft?: boolean;
    source?: string | null;
    line_count?: number;
    total_amount?: number;
  };
  recommended_action?: string | null;
}

export interface CollectionAllocation {
  installment_id: number;
  student_fee_id?: number;
  amount: number;
}

export interface CollectionUpdatedOverview {
  totals: StudentFinancialOverviewTotals;
  counts?: StudentFinancialOverviewCounts;
  next_installment?: StudentFinancialOverviewNextInstallment | null;
}

export interface CreatePaymentCollectionResponse {
  collection: import('@/types/finance').PaymentCollection;
  updated_overview?: CollectionUpdatedOverview | null;
  receipt_id?: number | null;
  receipt_number?: string | null;
}
