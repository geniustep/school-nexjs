export type FeeTransferMode =
  | 'membership_only'
  | 'future_only'
  | 'open_unpaid_items'
  | 'selected_items';

export const FEE_TRANSFER_MODES: FeeTransferMode[] = [
  'membership_only',
  'future_only',
  'open_unpaid_items',
  'selected_items',
];

export type BillingMembershipRowAction =
  | 'add_member'
  | 'end_membership'
  | 'transfer_in'
  | 'transfer_out';

export type BillingMembershipOperationKind =
  | 'membership_transfer'
  | 'fee_realignment'
  | 'no_op'
  | 'membership_only'
  | string;

export type BillingMembershipWarning = {
  code?: string | null;
  message: string;
  severity?: string | null;
};

export type BillingAccountMemberRow = {
  student_id: number;
  student_name?: string;
  class_name?: string | null;
  membership_id?: number | null;
  active_membership_id?: number | null;
  current_billing_partner_id?: number | null;
  membership_start_date?: string | null;
  status?: string | null;
  status_label?: string | null;
  has_open_items?: boolean;
  total_remaining?: number;
  total_overdue?: number;
  warnings?: string[];
  currency?: unknown;
  allowed_actions?: BillingMembershipRowAction[];
};

export type BillingAccountMembersPayload = {
  billing_partner_id?: number;
  members: BillingAccountMemberRow[];
  total?: number;
  allowed_actions: BillingMembershipRowAction[];
};

export type AddBillingMemberRequest = {
  student_id: number;
  reason: string;
  start_date?: string | null;
  academic_year_id?: number | null;
};

export type EndBillingMemberRequest = {
  reason: string;
  end_date?: string | null;
};

export type TransferPreviewQuery = {
  academic_year_id?: number | null;
  start_date?: string | null;
  fee_transfer_mode?: FeeTransferMode;
  fee_ids?: number[];
};

export type TransferPreviewFee = {
  fee_id: number;
  name?: string | null;
  billing_partner_id?: number | null;
  state?: string | null;
  net_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  due_date?: string | null;
  classification?: 'movable' | 'preserved' | 'blocked' | string | null;
  reason?: string | null;
};

export type TransferPreviewTotals = {
  amount_movable?: number | null;
  amount_preserved?: number | null;
  amount_blocked?: number | null;
  old_account_remaining_before?: number | null;
  new_account_remaining_before?: number | null;
  expected_old_account_remaining_after?: number | null;
  expected_new_account_remaining_after?: number | null;
};

export type TransferPreviewPayload = {
  student_id: number;
  school_id?: number | null;
  academic_year_id?: number | null;
  from_billing_partner_id?: number | null;
  to_billing_partner_id?: number | null;
  active_membership_id?: number | null;
  membership_transfer_possible?: boolean;
  fee_transfer_mode?: FeeTransferMode | null;
  transition_date?: string | null;
  can_apply: boolean;
  recommendation?: string | null;
  operation_kind?: BillingMembershipOperationKind | null;
  membership_changed?: boolean | null;
  membership_transfer_id?: number | null;
  preview_token?: string | null;
  movable_fee_ids: number[];
  preserved_fee_ids: number[];
  blocked_fee_ids: number[];
  paid_fee_ids: number[];
  skipped_fee_ids: number[];
  movable_fees: TransferPreviewFee[];
  preserved_fees: TransferPreviewFee[];
  blocked_fees: TransferPreviewFee[];
  paid_fees: TransferPreviewFee[];
  skipped_fees: TransferPreviewFee[];
  totals: TransferPreviewTotals;
  warnings: BillingMembershipWarning[];
};

export type TransferApplyRequest = {
  preview_token?: string | null;
  fee_transfer_mode: FeeTransferMode;
  reason: string;
  start_date?: string | null;
  academic_year_id?: number | null;
  fee_ids?: number[];
};

export type TransferApplyResult = {
  success?: boolean;
  operation_kind?: BillingMembershipOperationKind | null;
  membership_changed?: boolean | null;
  membership_transfer_id?: number | null;
  moved_fee_ids: number[];
  amount_moved?: number | null;
  preserved_fee_ids: number[];
  blocked_fee_ids: number[];
  warnings: BillingMembershipWarning[];
};

/** @deprecated Use TransferApplyRequest in apply workflow phase. */
export type TransferBillingMemberRequest = {
  reason?: string;
  start_date?: string | null;
  preview_token?: string;
  fee_transfer_mode?: FeeTransferMode;
  fee_ids?: number[];
  academic_year_id?: number | null;
};
