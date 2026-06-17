// Finance admin resources — synced with Odoo /admin/finance/* (live probe, alwah).

import type { Ref, SchoolRef } from './api';

export type FeeTypeCategory = 'tuition' | 'transport' | 'meals' | 'activities' | 'canteen' | 'activity' | string;
export type FeeTypeFrequency = 'annual' | 'term' | 'monthly' | 'once' | 'custom' | string;
export type FeeTypeAction = 'view' | 'edit' | 'archive' | 'restore' | 'delete';
export type FeePlanState = 'draft' | 'confirmed' | 'archived' | string;
export type StudentFeeState = 'draft' | 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled' | string;
export type PaymentCollectionState = 'draft' | 'confirmed' | 'cancelled' | string;
export type PaymentMethod = 'cash' | 'cheque' | 'check' | 'transfer' | 'card' | 'bank' | string;

export type ChequeState = 'received' | 'deposited' | 'cleared' | 'rejected' | 'cancelled';

export interface ChequeRegistrationPayload {
  cheque_number: string;
  bank_name: string;
  holder_name: string;
  received_date: string;
  due_date: string;
}

export interface ChequeDepositPayload {
  deposited_date: string;
}

export interface ChequeClearPayload {
  cleared_date: string;
}

export interface ChequeRejectPayload {
  rejected_date: string;
  reason: string;
}

export interface ChequeCancelPayload {
  cancelled_date: string;
  reason: string;
}

export interface FinanceCheque {
  id: number;
  number?: string;
  collection_id?: number;
  student_id?: number;
  student_name?: string;
  student?: Ref & { code?: string; school_number?: string; full_name?: string };
  school_id?: number;
  school?: SchoolRef | { id: number; name: string };
  academic_year_id?: number;
  payer?: Ref;
  billing_partner_id?: number;
  amount?: number;
  currency?: string | { id?: number; name?: string; symbol?: string; decimal_places?: number };
  cheque_number?: string;
  bank_name?: string;
  bank?: string | { name?: string };
  bank_name_snapshot?: string;
  holder_name?: string;
  drawer_name?: string;
  received_date?: string;
  cheque_date?: string;
  due_date?: string;
  maturity_date?: string;
  deposited_date?: string;
  deposit_date?: string;
  cleared_date?: string;
  rejected_date?: string;
  bounced_date?: string;
  returned_date?: string;
  cancelled_date?: string;
  state?: ChequeState | string;
  state_label?: string;
  maturity_status?: string;
  lifecycle_state?: string;
  is_due?: boolean;
  is_overdue?: boolean;
  days_until_due?: number;
  bounce_reason?: string;
  rejection_reason?: string;
  return_reason?: string;
  cancellation_reason?: string;
  reversal_applied?: boolean;
  allowed_actions?: string[] | CollectionAllowedActionsMap;
  allocations?: FinanceChequeAllocation[];
  replaces_cheque_id?: number | null;
  replaced_by_cheque_id?: number | null;
  collection?: Ref & {
    reference?: string;
    amount?: number;
    state?: string;
    date?: string;
    collection_date?: string;
    receipt_number?: string;
  };
  is_postdated?: boolean;
  settlement_status?: string;
  bank_display_name?: string | null;
  public_notes?: string | null;
}

export interface FinanceChequeAllocation {
  id?: number;
  student_fee_id?: number;
  installment_id?: number;
  amount?: number;
  settlement_state?: string;
  state?: string;
}

export interface FinanceChequeSummary {
  pending_count?: number;
  due_count?: number;
  overdue_count?: number;
  deposited_count?: number;
  cleared_count?: number;
  rejected_count?: number;
  due_soon_count?: number;
}

export interface ParentChequeInfo {
  id?: number;
  state?: ChequeState | string;
  state_label?: string;
  cheque_number?: string;
  bank_name?: string;
  holder_name?: string;
  received_date?: string;
  due_date?: string;
  deposited_date?: string;
  cleared_date?: string;
  rejected_date?: string;
  cancelled_date?: string;
  reversal_applied?: boolean;
  is_due?: boolean;
  is_overdue?: boolean;
}

export interface FeeTypeCurrency {
  id: number;
  name: string;
  symbol?: string;
  decimal_places?: number;
}

export interface FeeTypeUsageSummary {
  is_used?: boolean;
  historical_usage?: boolean;
  can_delete?: boolean;
}

export interface FeeTypeUsage {
  fee_plan_count?: number;
  confirmed_fee_plan_count?: number;
  agreement_count?: number;
  student_fee_count?: number;
  installment_count?: number;
  collection_count?: number;
  receipt_count?: number;
  historical_usage?: boolean;
  can_delete?: boolean;
}

export interface FeeType {
  id: number;
  code: string;
  name: string;
  school_id: number;
  school?: SchoolRef | { id: number; name: string };
  category?: FeeTypeCategory;
  frequency?: FeeTypeFrequency;
  default_amount?: number;
  currency?: FeeTypeCurrency | string;
  is_mandatory?: boolean;
  requires_subscription?: boolean;
  requires_usage_tracking?: boolean;
  active?: boolean;
  sequence?: number;
  description?: string | null;
  usage_summary?: FeeTypeUsageSummary;
  allowed_actions?: FeeTypeAction[] | string[];
}

export interface FeeTypeDetail extends FeeType {
  usage?: FeeTypeUsage;
  create_date?: string;
  write_date?: string;
}

export interface UpdateFeeTypePayload {
  name?: string;
  code?: string;
  category?: FeeTypeCategory;
  frequency?: FeeTypeFrequency;
  default_amount?: number;
  currency_id?: number;
  is_mandatory?: boolean;
  requires_subscription?: boolean;
  requires_usage_tracking?: boolean;
  sequence?: number;
  description?: string | null;
}

export interface FeePlanLineFeeType {
  id: number;
  code: string;
  name: string;
  category: string;
}

export interface FeePlanInstallmentScheduleItem {
  sequence: number;
  due_date: string;
  amount: number;
}

export type FeePlanPricingMode = 'recurring_unit_price' | 'total_amount_installments';

export interface FeePlanLine {
  id: number;
  fee_type_id?: number;
  fee_type?: FeePlanLineFeeType;
  fee_type_name?: string;
  name?: string;
  description?: string | false;
  amount: number;
  quantity?: number;
  subtotal?: number;
  pricing_mode?: FeePlanPricingMode;
  expected_total?: number;
  installment_amount?: number;
  frequency?: FeeTypeFrequency;
  level_ids?: number[];
  due_rule?: string;
  due_date?: string | null;
  installment_count?: number;
  installment_schedule?: FeePlanInstallmentScheduleItem[];
  is_optional?: boolean;
  /** @deprecated Read-only legacy field — pricing lives on plan lines, not fee types. */
  deprecated_legacy_pricing?: unknown;
}

export interface FeePlanUsage {
  agreement_count?: number;
  student_fee_count?: number;
  installment_count?: number;
  collection_count?: number;
  receipt_count?: number;
  assigned_student_count?: number;
  /** @deprecated Prefer assigned_student_count from API */
  student_count?: number;
  is_used?: boolean;
}

export type FeePlanUsageSummary = FeePlanUsage;

export interface FeePlanAllowedActionsMap {
  view?: boolean;
  edit?: boolean;
  confirm?: boolean;
  reset_to_draft?: boolean;
  duplicate?: boolean;
  archive?: boolean;
  restore?: boolean;
  delete?: boolean;
  assign?: boolean;
  view_usage?: boolean;
}

/** @deprecated Use FeePlanAllowedActionsMap object from API */
export type FeePlanAllowedAction = keyof FeePlanAllowedActionsMap;

export interface FeePlanDuplicatePayload {
  name: string;
  academic_year_id: number;
  code?: string;
}

export interface FeePlan {
  id: number;
  code: string;
  name: string;
  school_id: number;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  level_id?: number | null;
  level?: Ref | null;
  class_id?: number | null;
  class?: Ref | null;
  level_ids?: number[];
  state?: FeePlanState;
  total_amount?: number;
  currency?: string;
  lines?: FeePlanLine[];
  date_from?: string | null;
  date_to?: string | null;
  notes?: string;
  allowed_actions?: FeePlanAllowedActionsMap;
  usage?: FeePlanUsage;
  usage_summary?: FeePlanUsageSummary;
}

export interface FeePlanLineInput {
  id?: number;
  fee_type_id: number;
  amount: number;
  quantity?: number;
  pricing_mode?: FeePlanPricingMode;
  frequency?: FeeTypeFrequency;
  level_ids?: number[];
  due_date?: string;
  installment_count?: number;
  installment_schedule?: FeePlanInstallmentScheduleItem[];
  due_rule?: string;
  is_optional?: boolean;
  description?: string;
}

export interface FinanceInstallment {
  id?: number;
  name?: string;
  sequence?: number;
  due_date?: string;
  amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  state?: string;
  status?: string;
  is_overdue?: boolean;
  overdue?: boolean;
  student_id?: number;
  student_name?: string;
  student_code?: string;
  class_id?: number;
  class_name?: string;
  level_id?: number;
  level_name?: string;
  total_amount?: number;
  overdue_amount?: number;
  days_overdue?: number;
  payment_status?: string;
  timing_status?: string;
  installment_description?: string;
  service_name?: string;
  academic_year_id?: number;
  academic_year_name?: string;
}

export interface FinanceAttentionMetric {
  count: number;
  amount?: number;
  quick?: string;
  state?: string;
  window_days?: number;
}

export interface FinanceOverviewAttention {
  overdue_installments?: FinanceAttentionMetric;
  due_next_7_days_installments?: FinanceAttentionMetric;
  due_next_30_days_installments?: FinanceAttentionMetric;
  cheques_due_soon?: FinanceAttentionMetric;
  cheques_rejected?: FinanceAttentionMetric;
  draft_collections?: FinanceAttentionMetric;
}

export interface FinanceInstallmentListSummary {
  total_count?: number;
  total_amount?: number;
  total_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
}

/** @deprecated Use FinanceInstallment — kept for FIN-WEB-1 compatibility */
export type Installment = FinanceInstallment;

export interface FinanceDiscount {
  id?: number;
  name?: string;
  type?: string;
  amount?: number;
  percent?: number;
  reason?: string;
  state?: string;
  status?: string;
  effective_date?: string;
  date_from?: string;
}

/** @deprecated Use FinanceDiscount */
export type Discount = FinanceDiscount;

export interface PaymentJournal {
  id: number;
  name: string;
  code?: string;
  type?: string;
  journal_type?: string;
  currency?: string;
  currency_code?: string;
  active?: boolean;
  allowed_payment_methods?: PaymentMethod[] | string[];
}

export interface PaymentMethodReference {
  code: PaymentMethod | string;
  name?: string;
  label?: string;
}

export interface AcademicYearReference {
  id: number;
  name: string;
  is_current?: boolean;
  code?: string;
}

export interface CurrencyReference {
  code: string;
  name?: string;
  symbol?: string;
}

export interface FinanceReferenceData {
  payment_journals?: PaymentJournal[];
  journals?: PaymentJournal[];
  academic_years?: AcademicYearReference[];
  payment_methods?: PaymentMethodReference[];
  currencies?: CurrencyReference[];
  service_categories?: { value: string; label: string }[];
  commitment_types?: { value: string; label: string }[];
  pricing_units?: { value: string; label: string }[];
  schedule_generation_modes?: { value: string; label: string }[];
  display_rules?: { value: string; label: string }[];
  first_period_policies?: { value: string; label: string }[];
}

export interface FinanceOverviewTotals {
  total_due?: number;
  total_collected?: number;
  total_paid?: number;
  confirmed_paid?: number;
  total_remaining?: number;
  remaining_amount?: number;
  total_overdue?: number;
  overdue_amount?: number;
  uncovered_amount?: number;
  pending_cheques?: number;
  students_with_balance?: number;
  overdue_installments_count?: number;
  overdue_installments?: number;
  draft_agreements_count?: number;
  active_agreements_count?: number;
  collections_count?: number;
  collections_amount?: number;
  period_collections_count?: number;
  period_collections_amount?: number;
  collection_count_period?: number;
  total_collected_period?: number;
  total_cleared_liquidity_period?: number;
  cheques_pending_amount?: number;
  cheques_due_amount?: number;
  cheques_deposited_amount?: number;
  cheques_cleared_amount?: number;
  cheques_rejected_amount?: number;
  cheques_pending_count?: number;
  cheques_due_count?: number;
  cheques_deposited_count?: number;
  cheques_cleared_count?: number;
  cheques_rejected_count?: number;
  currency?: string;
}

export interface FinanceFollowupStudent {
  id: number;
  name?: string;
  student?: { id: number; name: string };
  code?: string;
  class?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
  remaining_amount?: number;
  overdue_amount?: number;
  currency?: string;
}

export interface AdminFinanceOverview extends Omit<Partial<FinanceOverviewTotals>, 'overdue_installments'> {
  totals?: FinanceOverviewTotals;
  summary?: FinanceOverviewTotals;
  attention?: FinanceOverviewAttention;
  cheques?: {
    received?: number;
    deposited?: number;
    cleared?: number;
    bounced?: number;
    rejected?: number;
    overdue?: number;
  };
  recent_collections?: PaymentCollection[];
  followup_students?: FinanceFollowupStudent[];
  students_needing_followup?: FinanceFollowupStudent[];
  upcoming_installments?: FinanceInstallment[];
  overdue_installments?: FinanceInstallment[];
  as_of_date?: string;
}

export interface FinanceStudentSearchResult {
  id: number;
  name?: string;
  full_name?: string;
  code?: string | null;
  class?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
  school?: { id: number; name: string } | null;
  total_due?: number;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  overdue_amount?: number;
  balance?: number;
  currency?: string;
}

export interface FinanceStudentSearchResponse {
  items?: FinanceStudentSearchResult[];
  results?: FinanceStudentSearchResult[];
}

export interface EligibleBillingPartner {
  id: number;
  name: string;
  type?: string;
  billing_partner_type?: string;
  phone?: string | null;
  payer_name?: string;
}

export interface ParentFinanceChildSummary {
  id: number;
  name?: string;
  full_name?: string;
  school?: { id: number; name: string } | null;
  class?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
  academic_year?: { id: number; name: string } | string | null;
  total_due?: number;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  overdue_amount?: number;
  next_due_date?: string | null;
  currency?: string;
}

export interface ParentFinanceOverview {
  children?: ParentFinanceChildSummary[];
}

export interface ParentChildFinanceDetails {
  student?: { id: number; name: string; code?: string | null };
  school?: { id: number; name: string } | null;
  class?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
  academic_year?: { id: number; name: string } | string | null;
  summary?: {
    total_due?: number;
    paid_amount?: number;
    remaining_amount?: number;
    overdue_amount?: number;
    currency?: string;
  };
  billing_partner?: { name?: string; type?: string } | null;
  payer_name?: string;
  fees?: StudentFee[];
  recent_collections?: ParentFinanceCollection[];
  collections?: ParentFinanceCollection[];
}

export interface ParentFinanceCollection {
  id: number;
  reference?: string;
  name?: string;
  receipt_number?: string;
  collection_date?: string;
  date?: string;
  amount?: number;
  total_amount?: number;
  payment_method?: PaymentMethod | string;
  state?: PaymentCollectionState;
  status?: PaymentCollectionState;
  currency?: string;
  allocations?: PaymentAllocation[];
  cheque?: ParentChequeInfo;
  reversal_applied?: boolean;
}

export interface PaymentAllocation {
  id?: number;
  student_id?: number;
  student_fee_id?: number;
  fee_id?: number;
  installment_id?: number;
  amount?: number;
  allocated_amount?: number;
  settlement_state?: string;
  state?: string;
  fee_name?: string;
  fee_type_name?: string;
  period_label?: string | null;
  display_label?: string | null;
  installment_sequence?: number | null;
  installment_count?: number | null;
  student_fee?: Ref;
  installment?: Ref;
}

export interface StudentFee {
  id: number;
  student_id?: number;
  student?: Ref;
  school?: SchoolRef;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  fee_plan_id?: number;
  fee_plan?: Ref;
  fee_type_id?: number;
  fee_type?: Ref;
  original_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  balance_amount?: number;
  balance?: number;
  state?: StudentFeeState;
  status?: StudentFeeState;
  due_date?: string | null;
  next_due_date?: string | null;
  currency?: string;
  /** Display label from API (e.g. "Student — Fee type"). */
  name?: string;
  fee_type_name?: string;
  service?: Ref | { id?: number; name?: string; code?: string };
  description?: string | null;
  installments?: FinanceInstallment[];
  discounts?: FinanceDiscount[];
  lines?: FinanceInstallment[];
  cheque?: FinanceCheque | ParentChequeInfo;
  paid_by_cheque?: boolean;
}

export type CollectionAllowedActionsMap = Record<string, boolean | number | undefined>;

export interface CollectionStatusHistoryEntry {
  event?: string;
  state?: string;
  date?: string;
  occurred_at?: string;
  actor_id?: number;
  actor_name?: string;
  user?: Ref;
}

export interface PaymentCollection {
  id: number;
  reference?: string;
  name?: string;
  student_id?: number;
  student?: Ref;
  student_name?: string;
  student_code?: string | null;
  school?: SchoolRef;
  school_id?: number;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  billing_partner_id?: number;
  billing_partner?: Ref;
  billing_partner_name?: string;
  billing_party_type?: 'guardian' | 'student' | 'custom' | string;
  payer_name?: string;
  amount?: number;
  total_amount?: number;
  payment_method?: PaymentMethod;
  collection_date?: string;
  date?: string;
  payment_date?: string;
  state?: PaymentCollectionState;
  status?: PaymentCollectionState;
  currency?: string;
  notes?: string;
  journal_id?: number;
  journal?: Ref & { code?: string };
  created_by?: Ref;
  user?: Ref;
  allocations?: PaymentAllocation[];
  status_history?: CollectionStatusHistoryEntry[];
  cheque?: FinanceCheque | ParentChequeInfo;
  cheque_id?: number | null;
  reversal_applied?: boolean;
  receipt_id?: number | null;
  receipt_number?: string | null;
  collection_amount?: number;
  allocated_amount?: number;
  unallocated_amount?: number;
  allocation_count?: number;
  allocation_status?: string;
  allowed_actions?: string[] | CollectionAllowedActionsMap;
  updated_overview?: import('@/types/student-financial-overview').CollectionUpdatedOverview | null;
}

export interface StudentFinanceProfile {
  student_id?: number;
  student?: Ref;
  school?: SchoolRef;
  academic_year_id?: number;
  academic_year?: Ref | string | null;
  billing_partner_id?: number;
  billing_partner?: Ref;
  billing_partner_type?: string;
  payer_name?: string;
  payer_phone?: string;
  guardian_id?: number;
  guardian?: Ref;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  overdue_amount?: number;
  balance?: number;
  currency?: string;
  fees?: StudentFee[];
  installments?: FinanceInstallment[];
  discounts?: FinanceDiscount[];
  collections?: PaymentCollection[];
}

export interface CreateFeeTypePayload {
  name: string;
  code: string;
  category?: FeeTypeCategory;
  description?: string;
  requires_subscription?: boolean;
  requires_usage_tracking?: boolean;
  /** @deprecated Catalog-only — do not send pricing fields on create. */
  frequency?: FeeTypeFrequency;
  /** @deprecated Catalog-only — do not send pricing fields on create. */
  default_amount?: number;
  /** @deprecated Catalog-only — do not send pricing fields on create. */
  is_mandatory?: boolean;
}

export interface CreateFeePlanPayload {
  school_id: number;
  name: string;
  code: string;
  academic_year_id: number;
  level_id?: number;
  class_id?: number;
  lines?: FeePlanLineInput[];
  date_from?: string;
  date_to?: string;
  notes?: string;
}

export interface UpdateFeePlanPayload {
  name?: string;
  code?: string;
  level_id?: number | null;
  class_id?: number | null;
  lines?: FeePlanLineInput[];
  date_from?: string | null;
  date_to?: string | null;
  notes?: string;
}

export interface AssignStudentFeePayload {
  fee_plan_id: number;
  effective_date: string;
  selected_optional_line_ids: number[];
}

export interface BillingProfileAssignmentSummary {
  id?: number;
  created_automatically?: boolean;
  billing_partner_id?: number;
  billing_party_type?: 'guardian' | 'student' | 'custom' | string;
}

export interface AssignStudentFeePlanResponse {
  billing_profile?: BillingProfileAssignmentSummary;
  assigned_fee_ids?: number[];
  assigned_required_line_ids?: number[];
  assigned_optional_line_ids?: number[];
  skipped_optional_line_ids?: number[];
  fees?: StudentFee[];
}

export interface CreatePaymentCollectionPayload {
  student_id: number;
  academic_year_id: number;
  journal_id: number;
  billing_partner_id?: number;
  billing_profile_id?: number;
  amount: number;
  payment_method: PaymentMethod;
  collection_date?: string;
  payment_date?: string;
  reference?: string;
  notes?: string;
  allocation_mode?: 'selected_installments' | 'auto' | string;
  allocations?: { student_fee_id?: number; installment_id?: number; amount: number }[];
  cheque?: ChequeRegistrationPayload;
  idempotency_key?: string;
}

export interface UpdateBillingProfilePayload {
  billing_partner_type?: string;
  billing_partner_id?: number;
  guardian_id?: number;
  payer_name?: string;
  payer_phone?: string;
}

export type FinanceReceiptState = 'issued' | 'reversed' | 'cancelled_before_issue' | string;

export type FinanceReceiptSettlementStatus =
  | 'settled'
  | 'pending_cheque'
  | 'cheque_cleared'
  | 'cheque_bounced'
  | 'reversed'
  | string;

export type FinanceReceiptAllocationStatus = 'fully_allocated' | 'partially_allocated' | 'unallocated' | string;

export interface FinanceReceiptSettlement {
  status?: FinanceReceiptSettlementStatus;
  is_final?: boolean;
  label_ar?: string;
  label_fr?: string;
}

export interface FinanceReceiptAllocation {
  id?: number;
  installment_id?: number;
  student_fee_id?: number;
  description?: string;
  due_date?: string | null;
  amount?: number;
  label?: string;
}

export interface FinanceReceiptCheque {
  id?: number;
  number?: string;
  bank_name?: string;
  drawer_name?: string;
  holder_name?: string;
  maturity_date?: string | null;
  due_date?: string | null;
  state?: string;
}

export interface FinanceReceiptSnapshot {
  audit?: {
    source?: string;
    issued_at?: string;
    created_by?: string;
    confirmed_at?: string;
    confirmed_by?: string;
    receipt_number?: string;
  };
  payer?: Ref;
  student?: Ref & { code?: string; class_name?: string; level_name?: string };
  school?: SchoolRef & { code?: string; email?: string; phone?: string; address?: string };
  collection?: {
    id?: number;
    amount?: number;
    journal?: string;
    currency?: string;
    reference?: string;
    payment_date?: string;
    payment_method?: string;
    currency_symbol?: string;
  };
  cheque?: FinanceReceiptCheque;
  totals?: FinanceReceiptTotals;
  settlement?: FinanceReceiptSettlement;
  allocations?: FinanceReceiptAllocation[];
}

export interface FinanceReceiptTotals {
  collection_amount?: number;
  allocated_amount?: number;
  unallocated_amount?: number;
  allocation_status?: FinanceReceiptAllocationStatus;
}

export interface FinanceReceipt {
  id: number;
  number?: string;
  receipt_number?: string;
  state?: FinanceReceiptState;
  settlement_status?: FinanceReceiptSettlementStatus;
  settlement?: FinanceReceiptSettlement;
  collection_id?: number;
  school_id?: number;
  student_id?: number;
  student_name?: string;
  payer_name?: string;
  payer?: Ref;
  issued_at?: string | null;
  issued_by?: Ref | string | null;
  print_count?: number;
  generated_from_legacy?: boolean;
  collection_amount?: number;
  allocated_amount?: number;
  unallocated_amount?: number;
  allocation_status?: FinanceReceiptAllocationStatus;
  payment_method?: PaymentMethod | string;
  allowed_actions?: string[];
  print_url?: string;
  snapshot?: FinanceReceiptSnapshot;
  totals?: FinanceReceiptTotals;
  allocations?: FinanceReceiptAllocation[];
  cheque?: FinanceReceiptCheque;
  currency?: string;
}
