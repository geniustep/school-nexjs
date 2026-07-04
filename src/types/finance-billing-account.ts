import type { Ref } from '@/types/api';

export type BillingAccountAllowedAction =
  | 'view_summary'
  | 'view_collections'
  | 'view_receipts'
  | 'collect_payment'
  | 'view_cheques'
  | 'view_agreements'
  | 'view_credit';

export type BillingAccountCreditMetrics = {
  gross_unallocated_amount?: number;
  pending_unallocated_amount?: number;
  available_credit_amount?: number;
  blocked_unallocated_amount?: number;
  applied_credit_amount?: number;
  refundable_credit_amount?: number;
};

export type BillingAccountSummaryMetrics = {
  student_count?: number;
  total_due?: number;
  confirmed_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
  pending_cheque_amount?: number;
  confirmed_collection_amount?: number;
  unallocated_collection_amount?: number;
  receipt_count?: number;
  receipt_amount?: number;
  collection_count?: number;
  currency?: unknown;
  credit?: BillingAccountCreditMetrics;
};

export type BillingAccountPartner = {
  id: number;
  display_name?: string;
  name?: string;
  reference?: string | null;
  account_type?: string;
  student_count?: number;
  school_ids?: number[];
  phone?: string | null;
  email?: string | null;
};

export type BillingAccountListItem = {
  billing_partner_id: number;
  billing_partner?: BillingAccountPartner | Ref | null;
  display_name?: string;
  reference?: string | null;
  student_count?: number;
  account_kind?: 'family' | 'individual' | 'empty' | string | null;
  total_due?: number;
  confirmed_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
  pending_cheque_amount?: number;
  confirmed_collection_amount?: number;
  unallocated_collection_amount?: number;
  status?: string | null;
  status_label?: string | null;
  currency?: unknown;
};

export type BillingAccountStudentRow = {
  student_id: number;
  student_name?: string;
  student_code?: string | null;
  class_name?: string | null;
  level_name?: string | null;
  active_agreements_count?: number;
  total_due?: number;
  confirmed_paid?: number;
  total_remaining?: number;
  total_overdue?: number;
  pending_cheque_amount?: number;
  next_installment_date?: string | null;
  receipt_count?: number;
  currency?: unknown;
  allowed_actions?: BillingAccountAllowedAction[] | Record<string, boolean>;
};

export type BillingAccountActivity = {
  id?: number | string;
  type?: string;
  activity_type?: string;
  label?: string;
  date?: string;
  occurred_at?: string;
  amount?: number | null;
  currency?: unknown;
  student_id?: number | null;
  student_name?: string | null;
  reference?: string | null;
  state?: string | null;
  state_label?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  collection_id?: number | null;
  receipt_id?: number | null;
  cheque_id?: number | null;
  installment_id?: number | null;
};

export type BillingAccountAppliedFilters = {
  billing_partner_id?: number | null;
  search?: string | null;
  academic_year_id?: number | null;
  academic_year_scope?: string | null;
  class_id?: number | null;
  level_id?: number | null;
  has_balance?: boolean;
  has_overdue?: boolean;
  account_kind?: string | null;
};

export type BillingAccountSummaryPayload = {
  billing_account: BillingAccountPartner;
  summary: BillingAccountSummaryMetrics;
  students: BillingAccountStudentRow[];
  recent_activity: BillingAccountActivity[];
  applied_filters: BillingAccountAppliedFilters;
  allowed_actions: BillingAccountAllowedAction[];
};

export type BillingAccountDataQualityPayload = {
  students_without_billing_profile: Array<{
    student_id: number;
    student_name?: string;
    student_code?: string | null;
  }>;
  agreements_without_payer: unknown[];
  collections_without_payer: unknown[];
  payer_conflicts: unknown[];
  collection_payer_mismatches: unknown[];
  unassigned_billing_account: unknown[];
  counts?: Record<string, number>;
};
