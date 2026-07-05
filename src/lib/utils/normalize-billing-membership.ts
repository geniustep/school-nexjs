import { normalizeMoneyValue, parseFinanceList } from '@/lib/utils/finance-normalize';
import type { ApiErrorBody } from '@/types/api';
import type {
  BillingAccountMemberRow,
  BillingAccountMembersPayload,
  BillingMembershipRowAction,
  BillingMembershipWarning,
  FeeTransferMode,
  TransferApplyResult,
  TransferPreviewFee,
  TransferPreviewPayload,
  TransferPreviewQuery,
  TransferPreviewTotals,
} from '@/types/finance-billing-membership';

const KNOWN_ROW_ACTIONS = new Set<BillingMembershipRowAction>([
  'add_member',
  'end_membership',
  'transfer_in',
  'transfer_out',
]);

const KNOWN_FEE_MODES = new Set<FeeTransferMode>([
  'membership_only',
  'future_only',
  'open_unpaid_items',
  'selected_items',
]);

const ACTIVE_STATUSES = new Set(['active', 'current', 'ongoing']);

function readOptionalNumber(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function readOptionalBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw;
  if (raw === 1 || raw === '1' || raw === 'true') return true;
  if (raw === 0 || raw === '0' || raw === 'false') return false;
  return undefined;
}

function readIdList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'number' ? item : Number(item)))
    .filter((id) => typeof id === 'number' && !Number.isNaN(id));
}

export function normalizeMembershipAllowedActions(
  raw: unknown,
): BillingMembershipRowAction[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      return (Object.keys(raw) as BillingMembershipRowAction[]).filter(
        (action) =>
          KNOWN_ROW_ACTIONS.has(action) &&
          Boolean((raw as Record<string, boolean>)[action]),
      );
    }
    return [];
  }
  return raw
    .filter((action): action is string => typeof action === 'string')
    .map((action) => action.trim())
    .filter((action): action is BillingMembershipRowAction =>
      KNOWN_ROW_ACTIONS.has(action as BillingMembershipRowAction),
    );
}

export function hasMembershipAction(
  actions: BillingMembershipRowAction[] | undefined,
  action: BillingMembershipRowAction,
): boolean {
  return !!actions?.includes(action);
}

function readWarnings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        if (typeof row.message === 'string') return row.message.trim();
        if (typeof row.label === 'string') return row.label.trim();
        if (typeof row.code === 'string') return row.code.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function readStructuredWarnings(raw: unknown): BillingMembershipWarning[] {
  if (!Array.isArray(raw)) return [];
  const warnings: BillingMembershipWarning[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const message = item.trim();
      if (message) warnings.push({ message, code: message });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const message =
      (typeof row.message === 'string' ? row.message.trim() : '') ||
      (typeof row.label === 'string' ? row.label.trim() : '') ||
      (typeof row.code === 'string' ? row.code.trim() : '');
    if (!message) continue;
    warnings.push({
      code: typeof row.code === 'string' ? row.code : null,
      message,
      severity: typeof row.severity === 'string' ? row.severity : null,
    });
  }
  return warnings;
}

export function normalizeBillingAccountMember(raw: unknown): BillingAccountMemberRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const student_id = row.student_id ?? row.id;
  if (typeof student_id !== 'number' || Number.isNaN(student_id)) return null;

  const membership_id = readOptionalNumber(row.membership_id ?? row.active_membership_id);

  return {
    student_id,
    student_name:
      (typeof row.student_name === 'string' ? row.student_name : undefined) ??
      (typeof row.name === 'string' ? row.name : undefined),
    class_name:
      (typeof row.class_name === 'string' ? row.class_name : null) ??
      (typeof row.class === 'string' ? row.class : null) ??
      (row.class && typeof row.class === 'object'
        ? ((row.class as Record<string, unknown>).name as string | undefined) ?? null
        : null),
    membership_id: membership_id ?? null,
    active_membership_id: readOptionalNumber(row.active_membership_id) ?? membership_id ?? null,
    current_billing_partner_id: readOptionalNumber(row.current_billing_partner_id) ?? null,
    membership_start_date:
      (typeof row.membership_start_date === 'string' ? row.membership_start_date : null) ??
      (typeof row.start_date === 'string' ? row.start_date : null) ??
      (typeof row.joined_at === 'string' ? row.joined_at : null),
    status: typeof row.status === 'string' ? row.status : null,
    status_label:
      (typeof row.status_label === 'string' ? row.status_label : null) ??
      (typeof row.membership_status_label === 'string' ? row.membership_status_label : null),
    has_open_items: readOptionalBoolean(row.has_open_items),
    total_remaining: normalizeMoneyValue(row.total_remaining) ?? undefined,
    total_overdue: normalizeMoneyValue(row.total_overdue) ?? undefined,
    warnings: readWarnings(row.warnings ?? row.alerts),
    currency: row.currency,
    allowed_actions: normalizeMembershipAllowedActions(row.allowed_actions),
  };
}

export function normalizeBillingAccountMembers(data: unknown): BillingAccountMembersPayload | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    const members = data
      .map(normalizeBillingAccountMember)
      .filter((row): row is BillingAccountMemberRow => row != null);
    return { members, allowed_actions: [] };
  }

  if (typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const membersRaw = row.items ?? row.members ?? row.students;
  const members = parseFinanceList<unknown>(membersRaw)
    .map(normalizeBillingAccountMember)
    .filter((member): member is BillingAccountMemberRow => member != null);

  const billing_partner_id =
    typeof row.billing_partner_id === 'number'
      ? row.billing_partner_id
      : typeof row.billing_account_id === 'number'
        ? row.billing_account_id
        : undefined;

  const total = readOptionalNumber(row.total);

  return {
    billing_partner_id,
    members,
    total: total ?? undefined,
    allowed_actions: normalizeMembershipAllowedActions(row.allowed_actions),
  };
}

export function isActiveMembershipMember(member: BillingAccountMemberRow): boolean {
  const status = (member.status ?? '').trim().toLowerCase();
  if (!status) return false;
  return ACTIVE_STATUSES.has(status);
}

export function memberAllowsEnd(member: BillingAccountMemberRow): boolean {
  return (
    isActiveMembershipMember(member) &&
    hasMembershipAction(member.allowed_actions, 'end_membership')
  );
}

export function memberAllowsTransferOut(member: BillingAccountMemberRow): boolean {
  return (
    isActiveMembershipMember(member) &&
    hasMembershipAction(member.allowed_actions, 'transfer_out')
  );
}

function normalizeFeeTransferMode(raw: unknown): FeeTransferMode | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim() as FeeTransferMode;
  return KNOWN_FEE_MODES.has(value) ? value : null;
}

export function normalizeTransferPreviewFee(raw: unknown): TransferPreviewFee | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const fee_id = readOptionalNumber(row.fee_id ?? row.id);
  if (fee_id == null) return null;

  return {
    fee_id,
    name:
      (typeof row.name === 'string' ? row.name : null) ??
      (typeof row.label === 'string' ? row.label : null),
    billing_partner_id: readOptionalNumber(row.billing_partner_id) ?? null,
    state: typeof row.state === 'string' ? row.state : null,
    net_amount: normalizeMoneyValue(row.net_amount) ?? null,
    paid_amount: normalizeMoneyValue(row.paid_amount) ?? null,
    balance_amount: normalizeMoneyValue(row.balance_amount ?? row.remaining_amount) ?? null,
    due_date:
      (typeof row.due_date === 'string' ? row.due_date : null) ??
      (typeof row.due_on === 'string' ? row.due_on : null),
    classification:
      typeof row.classification === 'string'
        ? row.classification
        : typeof row.bucket === 'string'
          ? row.bucket
          : null,
    reason: typeof row.reason === 'string' ? row.reason : null,
  };
}

function normalizeTransferPreviewTotals(raw: unknown): TransferPreviewTotals {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
  const totals: TransferPreviewTotals = {};
  const keys: Array<keyof TransferPreviewTotals> = [
    'amount_movable',
    'amount_preserved',
    'amount_blocked',
    'old_account_remaining_before',
    'new_account_remaining_before',
    'expected_old_account_remaining_after',
    'expected_new_account_remaining_after',
  ];
  for (const key of keys) {
    if (!(key in row)) continue;
    const value = normalizeMoneyValue(row[key]);
    if (value != null) totals[key] = value;
    else if (row[key] === null) totals[key] = null;
  }
  return totals;
}

function normalizePreviewFeeList(raw: unknown): TransferPreviewFee[] {
  return parseFinanceList<unknown>(raw)
    .map(normalizeTransferPreviewFee)
    .filter((fee): fee is TransferPreviewFee => fee != null);
}

export function normalizeTransferPreviewPayload(raw: unknown): TransferPreviewPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const student_id = readOptionalNumber(row.student_id);
  if (student_id == null) return null;

  const totals = normalizeTransferPreviewTotals(row.totals);
  const movable_fee_ids = readIdList(row.movable_fee_ids);

  return {
    student_id,
    school_id: readOptionalNumber(row.school_id) ?? null,
    academic_year_id: readOptionalNumber(row.academic_year_id) ?? null,
    from_billing_partner_id: readOptionalNumber(row.from_billing_partner_id) ?? null,
    to_billing_partner_id: readOptionalNumber(row.to_billing_partner_id) ?? null,
    active_membership_id: readOptionalNumber(row.active_membership_id) ?? null,
    membership_transfer_possible: readOptionalBoolean(row.membership_transfer_possible),
    fee_transfer_mode: normalizeFeeTransferMode(row.fee_transfer_mode),
    transition_date: typeof row.transition_date === 'string' ? row.transition_date : null,
    can_apply: readOptionalBoolean(row.can_apply) === true,
    recommendation: typeof row.recommendation === 'string' ? row.recommendation : null,
    operation_kind:
      typeof row.operation_kind === 'string'
        ? row.operation_kind
        : typeof row.recommendation === 'string'
          ? row.recommendation
          : null,
    membership_changed: readOptionalBoolean(row.membership_changed) ?? null,
    membership_transfer_id: readOptionalNumber(row.membership_transfer_id) ?? null,
    preview_token: typeof row.preview_token === 'string' ? row.preview_token : null,
    movable_fee_ids,
    preserved_fee_ids: readIdList(row.preserved_fee_ids),
    blocked_fee_ids: readIdList(row.blocked_fee_ids),
    paid_fee_ids: readIdList(row.paid_fee_ids),
    skipped_fee_ids: readIdList(row.skipped_fee_ids),
    movable_fees: normalizePreviewFeeList(row.movable_fees),
    preserved_fees: normalizePreviewFeeList(row.preserved_fees),
    blocked_fees: normalizePreviewFeeList(row.blocked_fees),
    paid_fees: normalizePreviewFeeList(row.paid_fees),
    skipped_fees: normalizePreviewFeeList(row.skipped_fees),
    totals,
    warnings: readStructuredWarnings(row.warnings),
  };
}

export function isAlignedNoOpPreview(preview: TransferPreviewPayload): boolean {
  if (preview.can_apply) return false;
  const movableCount = preview.movable_fee_ids.length || preview.movable_fees.length;
  const amountMovable = preview.totals.amount_movable;
  const hasZeroMovableAmount = amountMovable === 0;
  const noMovableAmountField = amountMovable == null && movableCount === 0;
  return (
    movableCount === 0 &&
    (hasZeroMovableAmount || noMovableAmountField) &&
    (preview.operation_kind === 'no_op' ||
      preview.recommendation === 'membership_only' ||
      preview.from_billing_partner_id === preview.to_billing_partner_id)
  );
}

export function isFeeRealignmentPreview(
  preview: TransferPreviewPayload,
  context?: { targetPartnerId: number; activeMembershipPartnerId?: number | null },
): boolean {
  if ((preview.operation_kind ?? '').trim() === 'fee_realignment') return true;
  if (!context) {
    return (
      preview.from_billing_partner_id != null &&
      preview.to_billing_partner_id != null &&
      preview.from_billing_partner_id === preview.to_billing_partner_id &&
      preview.movable_fee_ids.length > 0
    );
  }
  const membershipOnTarget =
    context.activeMembershipPartnerId != null
      ? context.activeMembershipPartnerId === context.targetPartnerId
      : preview.membership_transfer_possible === false &&
        preview.to_billing_partner_id === context.targetPartnerId;
  if (!membershipOnTarget) return false;
  if (preview.membership_transfer_possible === true) return false;
  const movableCount = preview.movable_fee_ids.length || preview.movable_fees.length;
  const amountMovable = preview.totals.amount_movable ?? 0;
  return movableCount > 0 || amountMovable > 0;
}

export function validateMembershipReason(reason: string, minLength = 3): boolean {
  return reason.trim().length >= minLength;
}

export function isMembershipConflictError(error: ApiErrorBody | undefined): boolean {
  if (!error) return false;
  if (error.code === 'membership_conflict') return true;
  if (error.details?.code === 'membership_conflict') return true;
  return false;
}

export function billingMembershipErrorMessageKey(
  code: string | undefined,
  status?: number,
): string {
  switch (code) {
    case 'membership_conflict':
      return 'admin.finance.billingAccounts.members.errors.conflict';
    case 'membership_not_found':
      return 'admin.finance.billingAccounts.members.errors.notFound';
    case 'student_not_found':
      return 'admin.finance.billingAccounts.members.errors.studentNotFound';
    case 'already_member':
      return 'admin.finance.billingAccounts.members.errors.alreadyMember';
    case 'preview_stale':
      return 'admin.finance.billingAccounts.members.errors.previewStale';
    case 'fee_transfer_blocked':
      return 'admin.finance.billingAccounts.members.errors.feeTransferBlocked';
    case 'fee_ids_not_eligible':
      return 'admin.finance.billingAccounts.members.errors.feeIdsNotEligible';
    case 'preview_token_required':
      return 'admin.finance.billingAccounts.members.errors.previewTokenRequired';
    case 'invalid_filter':
      return 'admin.finance.billingAccounts.members.errors.invalidFilter';
    case 'forbidden':
    case 'permission_denied':
      return 'admin.finance.billingAccounts.members.errors.forbidden';
    case 'validation_error':
      return status === 422
        ? 'admin.finance.billingAccounts.members.errors.validation'
        : 'common.errorGeneric';
    default:
      return 'admin.finance.billingAccounts.members.errors.generic';
  }
}

export function transferPreviewFeeReasonKey(reason: string | null | undefined): string {
  switch ((reason ?? '').trim()) {
    case 'already_on_target_account':
      return 'admin.finance.billingAccounts.members.preview.reasons.alreadyOnTarget';
    case 'partial_fee_split_required':
      return 'admin.finance.billingAccounts.members.preview.reasons.partialFeeSplitRequired';
    case 'membership_fee_drift':
      return 'admin.finance.billingAccounts.members.preview.reasons.membershipFeeDrift';
    case 'paid_or_closed':
      return 'admin.finance.billingAccounts.members.preview.reasons.paidOrClosed';
    case 'blocked_by_policy':
      return 'admin.finance.billingAccounts.members.preview.reasons.blockedByPolicy';
    default:
      return 'admin.finance.billingAccounts.members.preview.reasons.unknown';
  }
}

export function transferPreviewWarningKey(warning: BillingMembershipWarning): string {
  const code = (warning.code ?? warning.message ?? '').trim();
  switch (code) {
    case 'membership_fee_drift':
      return 'admin.finance.billingAccounts.members.preview.warnings.membershipFeeDrift';
    case 'partial_fee_split_required':
      return 'admin.finance.billingAccounts.members.preview.warnings.partialFeeSplitRequired';
    case 'fee_transfer_blocked':
      return 'admin.finance.billingAccounts.members.preview.warnings.feeTransferBlocked';
    default:
      return 'admin.finance.billingAccounts.members.preview.warnings.generic';
  }
}

export function buildTransferPreviewQueryParams(
  query: TransferPreviewQuery,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query.academic_year_id != null) params.academic_year_id = query.academic_year_id;
  if (query.start_date?.trim()) params.start_date = query.start_date.trim();
  if (query.fee_transfer_mode) params.fee_transfer_mode = query.fee_transfer_mode;
  if (query.fee_ids?.length) params.fee_ids = query.fee_ids.join(',');
  return params;
}

export type TransferPreviewWorkflowPhase =
  | 'idle'
  | 'selecting_mode'
  | 'loading_preview'
  | 'preview_ready'
  | 'aligned_noop'
  | 'blocked'
  | 'error';

export function resolveTransferPreviewPhase(input: {
  loading: boolean;
  errorCode?: string | null;
  preview: TransferPreviewPayload | null;
}): TransferPreviewWorkflowPhase {
  if (input.loading) return 'loading_preview';
  if (input.errorCode) {
    if (input.errorCode === 'fee_transfer_blocked') return 'blocked';
    return 'error';
  }
  if (!input.preview) return 'idle';
  if (isAlignedNoOpPreview(input.preview)) return 'aligned_noop';
  if (
    !input.preview.can_apply &&
    input.preview.blocked_fee_ids.length > 0 &&
    !isFeeRealignmentPreview(input.preview)
  ) {
    return 'blocked';
  }
  return 'preview_ready';
}

export function normalizeTransferApplyResult(raw: unknown): TransferApplyResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  return {
    success: readOptionalBoolean(row.success),
    operation_kind:
      typeof row.operation_kind === 'string'
        ? row.operation_kind
        : typeof row.recommendation === 'string'
          ? row.recommendation
          : null,
    membership_changed: readOptionalBoolean(row.membership_changed) ?? null,
    membership_transfer_id: readOptionalNumber(row.membership_transfer_id) ?? null,
    moved_fee_ids: readIdList(row.moved_fee_ids),
    amount_moved: normalizeMoneyValue(row.amount_moved) ?? null,
    preserved_fee_ids: readIdList(row.preserved_fee_ids),
    blocked_fee_ids: readIdList(row.blocked_fee_ids),
    warnings: readStructuredWarnings(row.warnings),
  };
}
