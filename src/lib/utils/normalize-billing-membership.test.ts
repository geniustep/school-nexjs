import { describe, expect, it } from 'vitest';
import {
  billingMembershipErrorMessageKey,
  buildTransferPreviewQueryParams,
  hasMembershipAction,
  isActiveMembershipMember,
  isAlignedNoOpPreview,
  isFeeRealignmentPreview,
  isMembershipConflictError,
  memberAllowsEnd,
  memberAllowsTransferOut,
  normalizeBillingAccountMember,
  normalizeBillingAccountMembers,
  normalizeMembershipAllowedActions,
  normalizeTransferPreviewPayload,
  normalizeTransferApplyResult,
  resolveTransferPreviewPhase,
  transferPreviewFeeReasonKey,
  validateMembershipReason,
} from '@/lib/utils/normalize-billing-membership';
import type { BillingMembershipRowAction } from '@/types/finance-billing-membership';

describe('normalizeBillingAccountMember live shape', () => {
  it('reads data.items member fields', () => {
    const payload = normalizeBillingAccountMembers({
      billing_partner_id: 6667,
      total: 4,
      items: [
        {
          student_id: 1798,
          student_name: 'إبراهيم الحجام',
          class_name: 'P1A',
          active_membership_id: 186,
          current_billing_partner_id: 6667,
          joined_at: '2026-09-01',
          status: 'active',
          has_open_items: true,
          total_remaining: 18500,
          warnings: [],
          allowed_actions: ['transfer_out', 'end_membership'],
        },
      ],
    });

    expect(payload?.members).toHaveLength(1);
    expect(payload?.total).toBe(4);
    const member = payload?.members[0];
    expect(member?.active_membership_id).toBe(186);
    expect(member?.current_billing_partner_id).toBe(6667);
    expect(member?.has_open_items).toBe(true);
    expect(member?.allowed_actions).toEqual(['transfer_out', 'end_membership']);
  });

  it('does not treat missing status as active', () => {
    expect(isActiveMembershipMember({ student_id: 1, status: null })).toBe(false);
    expect(isActiveMembershipMember({ student_id: 1, status: 'active' })).toBe(true);
  });

  it('supports transfer_out and end_membership row actions', () => {
    const member = {
      student_id: 1,
      status: 'active',
      allowed_actions: ['transfer_out', 'end_membership'] as BillingMembershipRowAction[],
    };
    expect(memberAllowsTransferOut(member)).toBe(true);
    expect(memberAllowsEnd(member)).toBe(true);
  });

  it('filters unknown allowed actions safely', () => {
    expect(normalizeMembershipAllowedActions(['transfer_out', 'unknown_action'])).toEqual([
      'transfer_out',
    ]);
  });
});

describe('normalizeTransferPreviewPayload', () => {
  const alignedPreview = normalizeTransferPreviewPayload({
    student_id: 1798,
    from_billing_partner_id: 6667,
    to_billing_partner_id: 6667,
    can_apply: false,
    fee_transfer_mode: 'membership_only',
    recommendation: 'membership_only',
    movable_fee_ids: [],
    preserved_fee_ids: [2913, 2914, 2915],
    blocked_fee_ids: [],
    paid_fee_ids: [],
    skipped_fee_ids: [],
    movable_fees: [],
    preserved_fees: [
      {
        fee_id: 2913,
        name: 'Registration',
        balance_amount: 2500,
        reason: 'already_on_target_account',
      },
    ],
    blocked_fees: [],
    paid_fees: [],
    skipped_fees: [],
    totals: {
      amount_movable: 0,
      amount_preserved: 18500,
      amount_blocked: 0,
    },
    warnings: [],
    preview_token: 'token-abc',
  });

  it('normalizes preview totals and token', () => {
    expect(alignedPreview?.preview_token).toBe('token-abc');
    expect(alignedPreview?.totals.amount_movable).toBe(0);
    expect(alignedPreview?.totals.amount_preserved).toBe(18500);
    expect(alignedPreview?.preserved_fees[0]?.name).toBe('Registration');
  });

  it('detects aligned no-op preview', () => {
    expect(alignedPreview && isAlignedNoOpPreview(alignedPreview)).toBe(true);
    expect(resolveTransferPreviewPhase({ loading: false, preview: alignedPreview, errorCode: null })).toBe(
      'aligned_noop',
    );
  });

  it('handles absent operation_kind safely', () => {
    expect(alignedPreview?.operation_kind).toBe('membership_only');
  });

  it('detects fee realignment when movable fees exist on same partner', () => {
    const preview = normalizeTransferPreviewPayload({
      student_id: 1,
      from_billing_partner_id: 10,
      to_billing_partner_id: 10,
      can_apply: true,
      operation_kind: 'fee_realignment',
      movable_fee_ids: [99],
      preserved_fee_ids: [],
      blocked_fee_ids: [],
      paid_fee_ids: [],
      skipped_fee_ids: [],
      movable_fees: [{ fee_id: 99, name: 'Fee', balance_amount: 100 }],
      preserved_fees: [],
      blocked_fees: [],
      paid_fees: [],
      skipped_fees: [],
      totals: { amount_movable: 100 },
      warnings: [],
    });
    expect(preview && isFeeRealignmentPreview(preview)).toBe(true);
  });
});

describe('billing membership helpers', () => {
  it('maps preview error keys', () => {
    expect(billingMembershipErrorMessageKey('preview_stale')).toContain('previewStale');
    expect(billingMembershipErrorMessageKey('fee_ids_not_eligible')).toContain('feeIdsNotEligible');
  });

  it('maps fee reason keys', () => {
    expect(transferPreviewFeeReasonKey('already_on_target_account')).toContain('alreadyOnTarget');
  });

  it('builds preview query params', () => {
    expect(buildTransferPreviewQueryParams({ fee_transfer_mode: 'future_only' })).toEqual({
      fee_transfer_mode: 'future_only',
    });
  });

  it('validates membership reason and conflict errors', () => {
    expect(validateMembershipReason('ok reason')).toBe(true);
    expect(isMembershipConflictError({ code: 'membership_conflict', message: 'x' })).toBe(true);
    expect(hasMembershipAction(['end_membership'], 'end_membership')).toBe(true);
  });
});

describe('normalizeTransferApplyResult', () => {
  it('preserves explicit null and zero values in no-op', () => {
    const result = normalizeTransferApplyResult({
      operation_kind: 'no_op',
      membership_changed: false,
      membership_transfer_id: null,
      moved_fee_ids: [],
      amount_moved: 0,
      preserved_fee_ids: [1],
      blocked_fee_ids: [],
      warnings: [],
    });
    expect(result?.membership_transfer_id).toBeNull();
    expect(result?.moved_fee_ids).toEqual([]);
    expect(result?.amount_moved).toBe(0);
    expect(result?.preserved_fee_ids).toEqual([1]);
  });

  it('normalizes fee realignment result safely', () => {
    const result = normalizeTransferApplyResult({
      operation_kind: 'fee_realignment',
      membership_changed: false,
      moved_fee_ids: [99],
      amount_moved: 250,
      blocked_fee_ids: [5],
      warnings: [{ code: 'membership_fee_drift' }],
    });
    expect(result?.operation_kind).toBe('fee_realignment');
    expect(result?.membership_transfer_id).toBeNull();
    expect(result?.blocked_fee_ids).toEqual([5]);
    expect(result?.warnings[0]?.code).toBe('membership_fee_drift');
  });
});
