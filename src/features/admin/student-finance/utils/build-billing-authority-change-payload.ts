import type {
  BillingAuthorityChangeApplyRequest,
  BillingAuthorityChangePreviewRequest,
  BillingAuthorityPartyType,
  BillingAuthorityTarget,
} from '@/types/finance-billing-authority-change';

export type BillingAuthorityTargetSelection =
  | { kind: 'guardian'; guardianId: number; billingPartnerId?: number | null }
  | { kind: 'student' };

export function encodeBillingAuthorityTargetKey(target: BillingAuthorityTargetSelection): string {
  if (target.kind === 'student') return 'student:self';
  const partner = target.billingPartnerId != null ? `:${target.billingPartnerId}` : '';
  return `guardian:${target.guardianId}${partner}`;
}

export function decodeBillingAuthorityTargetKey(value: string): BillingAuthorityTargetSelection | null {
  if (value === 'student:self') return { kind: 'student' };
  const match = /^guardian:(\d+)(?::(\d+))?$/.exec(value.trim());
  if (!match) return null;
  return {
    kind: 'guardian',
    guardianId: Number(match[1]),
    billingPartnerId: match[2] ? Number(match[2]) : null,
  };
}

export function buildBillingAuthorityPreviewRequest(
  selection: BillingAuthorityTargetSelection,
): BillingAuthorityChangePreviewRequest {
  if (selection.kind === 'student') {
    return { billing_party_type: 'student' };
  }
  const payload: BillingAuthorityChangePreviewRequest = {
    billing_party_type: 'guardian',
    guardian_id: selection.guardianId,
  };
  if (selection.billingPartnerId != null) {
    payload.billing_partner_id = selection.billingPartnerId;
  }
  return payload;
}

export function buildBillingAuthorityApplyRequest(input: {
  previewToken: string;
  reason: string;
  selection: BillingAuthorityTargetSelection;
  confirmed?: boolean;
}): BillingAuthorityChangeApplyRequest {
  const preview = buildBillingAuthorityPreviewRequest(input.selection);
  const payload: BillingAuthorityChangeApplyRequest = {
    preview_token: input.previewToken.trim(),
    reason: input.reason.trim(),
    billing_party_type: preview.billing_party_type,
  };
  if (preview.guardian_id != null) payload.guardian_id = preview.guardian_id;
  if (preview.billing_partner_id != null) payload.billing_partner_id = preview.billing_partner_id;
  if (input.selection.kind === 'student') payload.confirmed = input.confirmed === true;
  return payload;
}

export function canSubmitBillingAuthorityReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export function canSubmitBillingAuthorityPreview(
  selection: BillingAuthorityTargetSelection | null,
): boolean {
  if (!selection) return false;
  if (selection.kind === 'guardian') return Number.isFinite(selection.guardianId);
  return true;
}

export function canSubmitBillingAuthorityApply(input: {
  previewToken: string | null | undefined;
  reason: string;
  selection: BillingAuthorityTargetSelection | null;
  confirmed: boolean;
  canApply: boolean;
}): boolean {
  if (!input.canApply) return false;
  if (!input.previewToken?.trim()) return false;
  if (!canSubmitBillingAuthorityReason(input.reason)) return false;
  if (!canSubmitBillingAuthorityPreview(input.selection)) return false;
  if (input.selection?.kind === 'student' && !input.confirmed) return false;
  return true;
}

export function billingAuthorityTargetFromOption(
  target: BillingAuthorityTarget,
): BillingAuthorityTargetSelection {
  if (target.billing_party_type === 'student') return { kind: 'student' };
  return {
    kind: 'guardian',
    guardianId: target.guardian_id ?? 0,
    billingPartnerId: target.billing_partner_id ?? null,
  };
}

export function resolveBillingAuthorityPartyType(
  selection: BillingAuthorityTargetSelection,
): BillingAuthorityPartyType {
  return selection.kind === 'student' ? 'student' : 'guardian';
}
