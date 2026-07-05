import {
  isAlignedNoOpPreview,
} from '@/lib/utils/normalize-billing-membership';
import type {
  FeeTransferMode,
  TransferApplyRequest,
  TransferApplyResult,
  TransferPreviewPayload,
} from '@/types/finance-billing-membership';

export type TransferApplyEligibility =
  | 'aligned_noop'
  | 'blocked'
  | 'fee_realignment'
  | 'regular_transfer'
  | 'not_ready';

export type PreviewContextInput = {
  billingPartnerId: number;
  studentId: number;
  academicYearId?: number | null;
  startDate: string;
  mode: FeeTransferMode;
  selectedFeeIds: number[];
};

/** Separates target account from active membership partner and fee-source partner. */
export type TransferEligibilityContext = {
  targetPartnerId: number;
  activeMembershipPartnerId?: number | null;
};

export function requiresPreviewToken(mode: FeeTransferMode): boolean {
  return mode !== 'membership_only';
}

export function buildPreviewContextSignature(input: PreviewContextInput): string {
  const feeIds = [...input.selectedFeeIds].sort((a, b) => a - b);
  return JSON.stringify({
    billingPartnerId: input.billingPartnerId,
    studentId: input.studentId,
    academicYearId: input.academicYearId ?? null,
    startDate: input.startDate.trim(),
    mode: input.mode,
    selectedFeeIds: feeIds,
  });
}

export function previewMatchesContext(
  preview: TransferPreviewPayload | null,
  signature: string | null,
  input: PreviewContextInput,
): boolean {
  if (!preview || !signature) return false;
  return signature === buildPreviewContextSignature(input);
}

export function previewHasMovableImpact(preview: TransferPreviewPayload): boolean {
  const movableCount = preview.movable_fee_ids.length || preview.movable_fees.length;
  const amountMovable = preview.totals.amount_movable ?? 0;
  return movableCount > 0 || amountMovable > 0;
}

export function resolveActiveMembershipPartnerId(
  preview: TransferPreviewPayload,
  context: TransferEligibilityContext,
): number | null {
  if (context.activeMembershipPartnerId != null) {
    return context.activeMembershipPartnerId;
  }
  if (
    preview.membership_transfer_possible === false &&
    preview.to_billing_partner_id != null &&
    preview.to_billing_partner_id === context.targetPartnerId
  ) {
    return context.targetPartnerId;
  }
  if (preview.membership_transfer_possible === true && preview.from_billing_partner_id != null) {
    return preview.from_billing_partner_id;
  }
  return null;
}

export function isMembershipAlreadyOnTarget(
  preview: TransferPreviewPayload,
  context: TransferEligibilityContext,
): boolean | null {
  const activePartnerId = resolveActiveMembershipPartnerId(preview, context);
  if (activePartnerId == null) return null;
  return activePartnerId === context.targetPartnerId;
}

export function isFeeRealignmentScenario(
  preview: TransferPreviewPayload,
  context: TransferEligibilityContext,
): boolean {
  if ((preview.operation_kind ?? '').trim() === 'fee_realignment') return true;

  const membershipOnTarget = isMembershipAlreadyOnTarget(preview, context);
  if (membershipOnTarget !== true) return false;
  if (preview.membership_transfer_possible === true) return false;
  if (!previewHasMovableImpact(preview)) return false;
  if (preview.blocked_fee_ids.length > 0 && !previewHasMovableImpact(preview)) return false;
  return true;
}

export function isAlignedNoOpScenario(
  preview: TransferPreviewPayload,
  context: TransferEligibilityContext,
): boolean {
  if (previewHasMovableImpact(preview)) return false;
  if (preview.blocked_fee_ids.length > 0) return false;

  const membershipOnTarget = isMembershipAlreadyOnTarget(preview, context);
  if (
    membershipOnTarget === true &&
    preview.membership_transfer_possible === false
  ) {
    return true;
  }

  return isAlignedNoOpPreview(preview);
}

export function resolveTransferApplyEligibility(
  preview: TransferPreviewPayload | null,
  mode: FeeTransferMode,
  context: TransferEligibilityContext,
): TransferApplyEligibility {
  if (!preview) return 'not_ready';

  if (isAlignedNoOpScenario(preview, context)) return 'aligned_noop';

  if (preview.membership_transfer_possible === true || preview.can_apply) {
    const membershipOnTarget = isMembershipAlreadyOnTarget(preview, context);
    if (membershipOnTarget !== true) {
      if (preview.blocked_fee_ids.length > 0 && !previewHasMovableImpact(preview) && !preview.can_apply) {
        return 'blocked';
      }
      return 'regular_transfer';
    }
  }

  if (isFeeRealignmentScenario(preview, context)) {
    return 'fee_realignment';
  }

  if (preview.blocked_fee_ids.length > 0) return 'blocked';

  const membershipOnTarget = isMembershipAlreadyOnTarget(preview, context);
  if (membershipOnTarget === false && previewHasMovableImpact(preview)) {
    return 'blocked';
  }

  if (membershipOnTarget === null) return 'not_ready';

  return 'not_ready';
}

export function canProceedToApplyConfirmation(
  preview: TransferPreviewPayload | null,
  mode: FeeTransferMode,
  signature: string | null,
  input: PreviewContextInput,
  eligibilityContext: TransferEligibilityContext,
): boolean {
  const eligibility = resolveTransferApplyEligibility(preview, mode, eligibilityContext);
  if (eligibility === 'aligned_noop' || eligibility === 'blocked' || eligibility === 'not_ready') {
    return false;
  }
  if (!previewMatchesContext(preview, signature, input)) return false;
  if (mode === 'selected_items' && input.selectedFeeIds.length === 0) return false;
  if (requiresPreviewToken(mode) && !preview?.preview_token) return false;
  return true;
}

export function buildTransferApplyRequest(input: {
  preview: TransferPreviewPayload;
  mode: FeeTransferMode;
  reason: string;
  startDate: string;
  academicYearId?: number | null;
  selectedFeeIds: number[];
}): TransferApplyRequest {
  const body: TransferApplyRequest = {
    fee_transfer_mode: input.mode,
    reason: input.reason.trim(),
    start_date: input.startDate.trim() || null,
    academic_year_id: input.academicYearId ?? null,
  };

  if (input.mode === 'selected_items') {
    body.fee_ids = [...input.selectedFeeIds].sort((a, b) => a - b);
  }

  if (input.preview.preview_token) {
    body.preview_token = input.preview.preview_token;
  }

  return body;
}

export function transferApplySuccessMessageKey(result: TransferApplyResult): string {
  const kind = (result.operation_kind ?? '').trim();
  if (kind === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.apply.successRealignment';
  }
  if (kind === 'no_op') {
    return 'admin.finance.billingAccounts.members.apply.successNoOp';
  }
  return 'admin.finance.billingAccounts.members.apply.successTransfer';
}

export function transferApplyContinueLabelKey(
  eligibility: TransferApplyEligibility,
): string {
  if (eligibility === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.apply.continueToConfirmRealignment';
  }
  return 'admin.finance.billingAccounts.members.apply.continueToConfirm';
}

export function transferApplyConfirmTitleKey(
  eligibility: TransferApplyEligibility,
): string {
  if (eligibility === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.apply.confirmTitleRealignment';
  }
  return 'admin.finance.billingAccounts.members.apply.confirmTitle';
}

export function transferApplyConfirmLabelKey(
  eligibility: TransferApplyEligibility,
): string {
  if (eligibility === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.apply.confirmRealignment';
  }
  return 'admin.finance.billingAccounts.members.apply.confirmTransfer';
}

export class ApplySubmitGuard {
  private locked = false;

  tryAcquire(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  release(): void {
    this.locked = false;
  }

  isLocked(): boolean {
    return this.locked;
  }
}

export function applyErrorRecoveryAction(
  code: string | undefined,
): 'refresh_preview' | 'clear_selection' | 'none' {
  switch (code) {
    case 'preview_stale':
    case 'preview_token_required':
    case 'fee_transfer_blocked':
      return 'refresh_preview';
    case 'fee_ids_not_eligible':
      return 'clear_selection';
    default:
      return 'none';
  }
}

export function transferApplyOperationLabelKey(
  eligibility: TransferApplyEligibility,
): string {
  if (eligibility === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.apply.operationRealignment';
  }
  return 'admin.finance.billingAccounts.members.apply.operationTransfer';
}

export function transferPreviewTitleKey(
  eligibility: TransferApplyEligibility,
): string {
  if (eligibility === 'fee_realignment') {
    return 'admin.finance.billingAccounts.members.preview.realignmentTitle';
  }
  return 'admin.finance.billingAccounts.members.preview.transferTitle';
}
