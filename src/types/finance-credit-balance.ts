import type { Ref } from '@/types/api';

export type CreditBalanceAmounts = {
  gross_unallocated_amount?: number | null;
  pending_unallocated_amount?: number | null;
  available_credit_amount?: number | null;
  blocked_unallocated_amount?: number | null;
  applied_credit_amount?: number | null;
  refundable_credit_amount?: number | null;
};

export type CreditBalanceLifecycleState =
  | 'available'
  | 'pending'
  | 'blocked'
  | 'applied'
  | 'fully_applied'
  | 'empty';

export type CreditBalanceAllowedAction =
  | 'view_credit'
  | 'view_source_collection'
  | 'view_receipt'
  | 'apply_credit'
  | 'view_cheque';

export type CreditBalanceListItem = CreditBalanceAmounts & {
  billing_partner_id: number;
  billing_account?: Ref | BillingAccountRef | null;
  display_name?: string | null;
  reference?: string | null;
  school_id?: number | null;
  currency?: unknown;
  currency_id?: number | null;
  source_count?: number | null;
  lifecycle_state?: CreditBalanceLifecycleState | string | null;
  allowed_actions?: CreditBalanceAllowedAction[] | Record<string, boolean>;
};

export type BillingAccountRef = {
  id: number;
  display_name?: string;
  name?: string;
  reference?: string | null;
  student_count?: number;
};

export type CreditBalanceListSummary = CreditBalanceAmounts & {
  account_count?: number | null;
};

export type CreditBalanceAppliedFilters = {
  billing_partner_id?: number | null;
  academic_year_id?: number | null;
  search?: string | null;
  state?: string | null;
  has_available_credit?: boolean | string | null;
};

export type CreditBalanceListResult = {
  items: CreditBalanceListItem[];
  summary: CreditBalanceListSummary | null;
  appliedFilters: CreditBalanceAppliedFilters | null;
};

export type CreditBalanceSource = {
  collection_id: number;
  receipt_id?: number | null;
  receipt_number?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  gross_unallocated_amount?: number | null;
  pending_unallocated_amount?: number | null;
  available_credit_amount?: number | null;
  blocked_unallocated_amount?: number | null;
  settlement_status?: string | null;
  lifecycle_state?: string | null;
  block_reason?: string | null;
  student_id?: number | null;
  student_name?: string | null;
  currency?: unknown;
  allowed_actions?: CreditBalanceAllowedAction[] | Record<string, boolean>;
};

export type CreditBalanceApplication = {
  id?: number;
  installment_id?: number;
  student_id?: number | null;
  student_name?: string | null;
  service_name?: string | null;
  amount?: number | null;
  date?: string | null;
  reference?: string | null;
};

export type CollectionCreditDetail = CreditBalanceAmounts & {
  collection_id: number;
  receipt_id?: number | null;
  receipt_number?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  amount?: number | null;
  allocated_amount?: number | null;
  unallocated_amount?: number | null;
  currency?: unknown;
  billing_partner_id?: number | null;
  student_id?: number | null;
  student_name?: string | null;
  settlement_status?: string | null;
  cheque_state?: string | null;
  lifecycle_state?: string | null;
  block_reason?: string | null;
  allowed_actions?: CreditBalanceAllowedAction[] | Record<string, boolean>;
  applications?: CreditBalanceApplication[];
  cheque_id?: number | null;
};

export type BillingAccountCreditDetail = CreditBalanceAmounts & {
  billing_partner_id: number;
  billing_account: BillingAccountRef;
  student_count?: number | null;
  currency?: unknown;
  lifecycle_state?: CreditBalanceLifecycleState | string | null;
  sources: CreditBalanceSource[];
  applications: CreditBalanceApplication[];
  allowed_actions?: CreditBalanceAllowedAction[] | Record<string, boolean>;
};

export type ApplyCreditAllocationPayload = {
  allocations: Array<{ installment_id: number; amount: number }>;
};

export type ApplyCreditErrorCode =
  | 'credit_balance_not_found'
  | 'credit_not_available'
  | 'insufficient_available_credit'
  | 'credit_pending_settlement'
  | 'credit_source_bounced'
  | 'credit_billing_account_mismatch'
  | 'credit_currency_mismatch'
  | 'duplicate_credit_application'
  | 'forbidden'
  | 'validation_error'
  | string;
