import type { ApiMeta, ListParams, Pagination, Ref, SchoolRef } from '@/types/api';
import type { PaymentCollection } from '@/types/finance';

export type FinanceCurrency = {
  id: number;
  name: string;
  symbol?: string;
  decimal_places?: number;
};

export type FinanceReferenceOption = {
  value: string;
  label: string;
};

export type AllowedActionsMap = Record<string, boolean>;

export type AgreementState =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'amended'
  | 'completed'
  | 'cancelled';

export type ScheduleItemState = 'planned' | 'cancelled' | 'waived';

export type InstallmentPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export type InstallmentTimingStatus =
  | 'hidden'
  | 'upcoming'
  | 'due'
  | 'overdue'
  | 'not_applicable';

export type ChequeLifecycleState =
  | 'draft'
  | 'received'
  | 'deposited'
  | 'cleared'
  | 'bounced'
  | 'returned_to_payer'
  | 'cancelled'
  | 'replaced';

export type ChequeMaturityStatus =
  | 'not_due'
  | 'due_today'
  | 'overdue'
  | 'settled'
  | 'not_applicable';

export interface FinancePaginationMeta extends Pagination {
  limit?: number;
  pages?: number;
  has_next?: boolean;
}

export interface StudentFinanceSummary {
  total_agreed?: number;
  total_due?: number;
  confirmed_paid?: number;
  pending_cheques?: number;
  remaining?: number;
  uncovered?: number;
  overdue?: number;
  overdue_installments_count?: number;
  currency?: FinanceCurrency | null;
}

export interface BillingProfile {
  id: number;
  student_id?: number;
  school_id?: number;
  academic_year_id?: number;
  billing_party_type?: string;
  billing_partner?: Ref;
  guardian_id?: number;
  effective_from?: string | null;
  effective_to?: string | null;
  state?: string;
  active?: boolean;
}

export interface FinancialAgreementLine {
  id?: number;
  service_id?: number;
  service?: Ref & { category?: string; code?: string };
  tariff_id?: number | null;
  tariff?: Ref | null;
  commitment_type?: string;
  pricing_unit?: string;
  period_start?: string | null;
  period_end?: string | null;
  quantity?: number;
  unit_price?: number;
  gross_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  is_mandatory?: boolean;
  is_selected?: boolean;
  canteen_settings?: Record<string, unknown> | null;
  transport_settings?: {
    line?: Ref | string | null;
    zone?: Ref | string | null;
    direction?: string | null;
    pickup_stop?: Ref | string | null;
    dropoff_stop?: Ref | string | null;
  } | null;
}

export interface AgreementScheduleItem {
  id?: number;
  sequence?: number;
  period_start?: string | null;
  period_end?: string | null;
  display_from?: string | null;
  due_date?: string | null;
  amount?: number;
  state?: ScheduleItemState | string;
}

export interface AgreementSchedulePolicies {
  generation_mode?: string;
  display_rule?: string;
  display_offset_days?: number;
  due_date_rule?: string;
  due_day_of_month?: number;
  due_offset_days?: number;
  first_period_policy?: string;
  allow_early_payment?: boolean;
}

export interface FinancialAgreement {
  id: number;
  number?: string;
  name?: string;
  student_id: number;
  school_id?: number;
  academic_year_id?: number;
  enrollment_id?: number;
  agreement_date?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  state: AgreementState | string;
  gross_amount?: number;
  discount_amount?: number;
  adjustment_amount?: number;
  net_amount?: number;
  currency?: FinanceCurrency | null;
  activated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  school?: SchoolRef;
  academic_year?: Ref;
  student?: Ref;
  enrollment?: { id?: number; class_name?: string };
  billing_profile_id?: number | null;
  billing_profile?: BillingProfile | null;
  billing_partner_id?: number | null;
  billing_partner?: Ref | null;
  schedule_policies?: AgreementSchedulePolicies;
  notes?: string | null;
  lines?: FinancialAgreementLine[];
  installments?: AgreementScheduleItem[];
  schedule_summary?: { installment_count?: number; total_amount?: number };
  allowed_actions?: AllowedActionsMap;
  discount_type?: string | null;
  discount_reason?: string | null;
}

export interface StudentInstallment {
  id: number;
  name?: string;
  sequence?: number;
  agreement_installment_id?: number | null;
  agreement_id?: number | null;
  agreement_line_id?: number | null;
  fee_id?: number | null;
  service?: Ref & { category?: string };
  period_start?: string | null;
  period_end?: string | null;
  display_from?: string | null;
  due_date?: string | null;
  grace_until?: string | null;
  amount?: number;
  confirmed_paid_amount?: number;
  pending_cheque_amount?: number;
  remaining_amount?: number;
  uncovered_amount?: number;
  is_visible?: boolean;
  state?: string;
  payment_status?: InstallmentPaymentStatus | string;
  timing_status?: InstallmentTimingStatus | string;
  schedule_status?: string;
  allow_early_payment?: boolean;
  allowed_actions?: AllowedActionsMap;
}

export interface ServiceSubscription {
  id: number;
  service?: Ref & { category?: string };
  tariff?: Ref | null;
  period_start?: string | null;
  period_end?: string | null;
  state?: string;
  pricing_method?: string;
  consumption?: Record<string, unknown> | null;
  canteen_details?: Record<string, unknown> | null;
  transport_details?: Record<string, unknown> | null;
}

export interface WorkspaceCheque {
  id: number;
  number?: string;
  name?: string;
  bank?: Ref | null;
  bank_name?: string;
  amount?: number;
  received_date?: string | null;
  date_received?: string | null;
  due_date?: string | null;
  state?: string;
  maturity_status?: ChequeMaturityStatus | string;
  lifecycle_state?: ChequeLifecycleState | string;
}

export interface StudentFinanceWorkspace {
  student?: Ref & { class?: Ref };
  academic_year?: Ref;
  finance_profile?: BillingProfile | null;
  billing_partner?: Ref | null;
  summary: StudentFinanceSummary;
  current_agreement?: FinancialAgreement | null;
  agreements_summary?: FinancialAgreement[];
  installments_summary?: {
    upcoming_count?: number;
    overdue_count?: number;
    hidden_count?: number;
  };
  upcoming_installments?: StudentInstallment[];
  overdue_installments?: StudentInstallment[];
  active_service_subscriptions?: ServiceSubscription[];
  recent_collections?: PaymentCollection[];
  recent_cheques?: WorkspaceCheque[];
  allowed_actions?: AllowedActionsMap;
  capabilities?: Record<string, boolean>;
}

export interface FinanceServiceCatalogItem {
  id: number;
  code?: string;
  name: string;
  category?: string;
  default_amount?: number;
  currency?: FinanceCurrency;
  is_mandatory?: boolean;
  requires_subscription?: boolean;
  active?: boolean;
}

export interface FinanceServiceTariff {
  id: number;
  service_id?: number;
  name?: string;
  code?: string;
  commitment_type?: string;
  pricing_unit?: string;
  unit_price?: number;
  currency?: FinanceCurrency;
  active?: boolean;
}

export interface SchedulePreviewResult {
  periods?: AgreementScheduleItem[];
  total?: number;
  warnings?: string[];
}

export interface CreateFinancialAgreementPayload {
  academic_year_id: number;
  enrollment_id: number;
  billing_profile_id: number;
  billing_partner_id: number;
  agreement_date: string;
  date_start?: string;
  date_end?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}

export interface UpdateFinancialAgreementPayload {
  agreement_date?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  discount_type?: string | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
  schedule_policies?: Partial<AgreementSchedulePolicies>;
  lines?: Partial<FinancialAgreementLine>[];
}

export interface InstallmentListParams extends ListParams {
  academic_year_id?: number;
  payment_status?: string;
  timing_status?: string;
  service_category?: string;
  date_from?: string;
  date_to?: string;
  exclude_paid?: number;
}

export interface StudentFinanceListMeta extends ApiMeta {
  pagination?: FinancePaginationMeta;
}
