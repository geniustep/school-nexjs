import { describe, expect, it } from 'vitest';
import {
  ApplySubmitGuard,
  applyErrorRecoveryAction,
  buildPreviewContextSignature,
  buildTransferApplyRequest,
  canProceedToApplyConfirmation,
  isFeeRealignmentScenario,
  previewMatchesContext,
  requiresPreviewToken,
  resolveTransferApplyEligibility,
  transferApplyConfirmLabelKey,
  transferApplyContinueLabelKey,
  transferApplyOperationLabelKey,
  transferPreviewTitleKey,
  transferApplySuccessMessageKey,
  type TransferEligibilityContext,
} from '@/lib/utils/billing-membership-apply';
import { canManageBillingMembership } from '@/lib/permissions/finance';
import { normalizeTransferPreviewPayload } from '@/lib/utils/normalize-billing-membership';
import type { TransferPreviewPayload } from '@/types/finance-billing-membership';
import type { CurrentUser } from '@/types/user';

const target6667: TransferEligibilityContext = { targetPartnerId: 6667 };

const baseContext = {
  billingPartnerId: 6667,
  studentId: 1798,
  academicYearId: 1,
  startDate: '2026-09-01',
  mode: 'membership_only' as const,
  selectedFeeIds: [] as number[],
};

function preview1798Aligned(): TransferPreviewPayload {
  return normalizeTransferPreviewPayload({
    student_id: 1798,
    from_billing_partner_id: 6667,
    to_billing_partner_id: 6667,
    can_apply: false,
    membership_transfer_possible: false,
    movable_fee_ids: [],
    preserved_fee_ids: [2913],
    blocked_fee_ids: [],
    paid_fee_ids: [],
    skipped_fee_ids: [],
    movable_fees: [],
    preserved_fees: [],
    blocked_fees: [],
    paid_fees: [],
    skipped_fees: [],
    totals: { amount_movable: 0, amount_preserved: 18500, amount_blocked: 0 },
    warnings: [],
    preview_token: 'aligned-token',
  })!;
}

function preview1797FeeRealignment(): TransferPreviewPayload {
  return normalizeTransferPreviewPayload({
    student_id: 1797,
    from_billing_partner_id: 8886,
    to_billing_partner_id: 6667,
    can_apply: false,
    membership_transfer_possible: false,
    movable_fee_ids: [2910, 2911, 2912],
    preserved_fee_ids: [],
    blocked_fee_ids: [],
    paid_fee_ids: [],
    skipped_fee_ids: [],
    movable_fees: [
      { fee_id: 2910, name: 'Registration', balance_amount: 2500 },
      { fee_id: 2911, name: 'Tuition', balance_amount: 12000 },
      { fee_id: 2912, name: 'Transport', balance_amount: 4000 },
    ],
    preserved_fees: [],
    blocked_fees: [],
    paid_fees: [],
    skipped_fees: [],
    totals: { amount_movable: 18500, amount_preserved: 0, amount_blocked: 0 },
    warnings: [{ code: 'membership_fee_drift' }],
    preview_token: 'realign-1797',
  })!;
}

function preview1849SelectedItems(): TransferPreviewPayload {
  return normalizeTransferPreviewPayload({
    student_id: 1849,
    from_billing_partner_id: 8946,
    to_billing_partner_id: 6667,
    can_apply: true,
    membership_transfer_possible: true,
    movable_fee_ids: [3003, 3004],
    preserved_fee_ids: [],
    blocked_fee_ids: [],
    paid_fee_ids: [],
    skipped_fee_ids: [],
    movable_fees: [
      { fee_id: 3003, name: 'Registration', balance_amount: 2500 },
      { fee_id: 3004, name: 'Tuition', balance_amount: 12000 },
    ],
    preserved_fees: [],
    blocked_fees: [],
    paid_fees: [],
    skipped_fees: [],
    totals: { amount_movable: 14500 },
    warnings: [],
    preview_token: 'transfer-1849',
  })!;
}

function regularTransferPreview(): TransferPreviewPayload {
  return normalizeTransferPreviewPayload({
    student_id: 1,
    from_billing_partner_id: 10,
    to_billing_partner_id: 6667,
    can_apply: true,
    membership_transfer_possible: true,
    movable_fee_ids: [1],
    preserved_fee_ids: [],
    blocked_fee_ids: [],
    paid_fee_ids: [],
    skipped_fee_ids: [],
    movable_fees: [{ fee_id: 1, name: 'Tuition', balance_amount: 500 }],
    preserved_fees: [],
    blocked_fees: [],
    paid_fees: [],
    skipped_fees: [],
    totals: { amount_movable: 500 },
    warnings: [],
    preview_token: 'transfer-token',
  })!;
}

describe('resolveTransferApplyEligibility', () => {
  it('keeps 1798 as aligned no-op', () => {
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 6667 };
    expect(resolveTransferApplyEligibility(preview1798Aligned(), 'membership_only', context)).toBe(
      'aligned_noop',
    );
  });

  it('classifies 1797 live payload as fee realignment when membership is on target', () => {
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 6667 };
    expect(resolveTransferApplyEligibility(preview1797FeeRealignment(), 'open_unpaid_items', context)).toBe(
      'fee_realignment',
    );
    expect(isFeeRealignmentScenario(preview1797FeeRealignment(), context)).toBe(true);
  });

  it('does not require from fee partner to equal target for realignment', () => {
    const preview = preview1797FeeRealignment();
    expect(preview.from_billing_partner_id).toBe(8886);
    expect(preview.to_billing_partner_id).toBe(6667);
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 6667 };
    expect(resolveTransferApplyEligibility(preview, 'open_unpaid_items', context)).toBe('fee_realignment');
  });

  it('keeps 1849 selected_items as regular transfer', () => {
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 8946 };
    expect(resolveTransferApplyEligibility(preview1849SelectedItems(), 'selected_items', context)).toBe(
      'regular_transfer',
    );
  });

  it('enables regular transfer when membership can move', () => {
    expect(resolveTransferApplyEligibility(regularTransferPreview(), 'future_only', target6667)).toBe(
      'regular_transfer',
    );
  });

  it('blocks false-positive realignment when membership is not on target', () => {
    const preview = normalizeTransferPreviewPayload({
      student_id: 1797,
      from_billing_partner_id: 8886,
      to_billing_partner_id: 6667,
      can_apply: false,
      membership_transfer_possible: false,
      movable_fee_ids: [2910],
      preserved_fee_ids: [],
      blocked_fee_ids: [],
      paid_fee_ids: [],
      skipped_fee_ids: [],
      movable_fees: [{ fee_id: 2910, name: 'Fee', balance_amount: 2500 }],
      preserved_fees: [],
      blocked_fees: [],
      paid_fees: [],
      skipped_fees: [],
      totals: { amount_movable: 2500 },
      warnings: [],
    })!;
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 8886 };
    expect(resolveTransferApplyEligibility(preview, 'open_unpaid_items', context)).toBe('blocked');
    expect(isFeeRealignmentScenario(preview, context)).toBe(false);
  });

  it('detects blocked state when only blocked fees remain', () => {
    const preview = normalizeTransferPreviewPayload({
      student_id: 1,
      from_billing_partner_id: 10,
      to_billing_partner_id: 6667,
      can_apply: false,
      movable_fee_ids: [],
      preserved_fee_ids: [],
      blocked_fee_ids: [5],
      paid_fee_ids: [],
      skipped_fee_ids: [],
      movable_fees: [],
      preserved_fees: [],
      blocked_fees: [{ fee_id: 5, name: 'Blocked', balance_amount: 100 }],
      paid_fees: [],
      skipped_fees: [],
      totals: { amount_movable: 0, amount_blocked: 100 },
      warnings: [],
    })!;
    expect(resolveTransferApplyEligibility(preview, 'open_unpaid_items', target6667)).toBe('blocked');
  });
});

describe('canProceedToApplyConfirmation', () => {
  it('allows 1797 fee realignment when preview is current', () => {
    const preview = preview1797FeeRealignment();
    const context = { targetPartnerId: 6667, activeMembershipPartnerId: 6667 };
    const input = { ...baseContext, studentId: 1797, mode: 'open_unpaid_items' as const };
    const signature = buildPreviewContextSignature(input);
    expect(canProceedToApplyConfirmation(preview, 'open_unpaid_items', signature, input, context)).toBe(
      true,
    );
  });

  it('allows regular transfer apply when preview is current', () => {
    const preview = regularTransferPreview();
    const signature = buildPreviewContextSignature({ ...baseContext, mode: 'future_only' });
    expect(
      canProceedToApplyConfirmation(preview, 'future_only', signature, {
        ...baseContext,
        mode: 'future_only',
      }, target6667),
    ).toBe(true);
  });

  it('blocks aligned no-op apply', () => {
    const preview = preview1798Aligned();
    const signature = buildPreviewContextSignature(baseContext);
    expect(
      canProceedToApplyConfirmation(preview, 'membership_only', signature, baseContext, {
        targetPartnerId: 6667,
        activeMembershipPartnerId: 6667,
      }),
    ).toBe(false);
  });

  it('blocks stale signature for realignment', () => {
    const preview = preview1797FeeRealignment();
    const oldSignature = buildPreviewContextSignature({
      ...baseContext,
      studentId: 1797,
      mode: 'membership_only',
    });
    const input = { ...baseContext, studentId: 1797, mode: 'open_unpaid_items' as const };
    expect(
      canProceedToApplyConfirmation(preview, 'open_unpaid_items', oldSignature, input, {
        targetPartnerId: 6667,
        activeMembershipPartnerId: 6667,
      }),
    ).toBe(false);
  });

  it('allows 1849 selected_items when preview matches selection', () => {
    const preview = preview1849SelectedItems();
    const input = {
      ...baseContext,
      studentId: 1849,
      mode: 'selected_items' as const,
      selectedFeeIds: [3003, 3004],
    };
    const signature = buildPreviewContextSignature(input);
    expect(
      canProceedToApplyConfirmation(preview, 'selected_items', signature, input, {
        targetPartnerId: 6667,
        activeMembershipPartnerId: 8946,
      }),
    ).toBe(true);
  });
});

describe('preview freshness signature', () => {
  it('mode change invalidates token match', () => {
    const preview = regularTransferPreview();
    const oldSignature = buildPreviewContextSignature({ ...baseContext, mode: 'membership_only' });
    expect(
      previewMatchesContext(preview, oldSignature, { ...baseContext, mode: 'future_only' }),
    ).toBe(false);
  });

  it('fee selection change invalidates token match', () => {
    const preview = regularTransferPreview();
    const oldSignature = buildPreviewContextSignature({
      ...baseContext,
      mode: 'selected_items',
      selectedFeeIds: [1],
    });
    expect(
      previewMatchesContext(preview, oldSignature, {
        ...baseContext,
        mode: 'selected_items',
        selectedFeeIds: [1, 2],
      }),
    ).toBe(false);
  });
});

describe('buildTransferApplyRequest', () => {
  it('includes exact fee_ids for selected_items', () => {
    const preview = preview1849SelectedItems();
    const body = buildTransferApplyRequest({
      preview,
      mode: 'selected_items',
      reason: 'Selected move',
      startDate: '2026-09-01',
      academicYearId: 1,
      selectedFeeIds: [3004, 3003],
    });
    expect(body.fee_ids).toEqual([3003, 3004]);
  });

  it('does not leak fee_ids for non-selected modes', () => {
    const preview = preview1797FeeRealignment();
    const body = buildTransferApplyRequest({
      preview,
      mode: 'open_unpaid_items',
      reason: 'Realign',
      startDate: '2026-09-01',
      academicYearId: 1,
      selectedFeeIds: [2910, 2911],
    });
    expect(body.fee_ids).toBeUndefined();
  });
});

describe('apply UX helpers', () => {
  it('uses realignment human wording keys', () => {
    expect(transferPreviewTitleKey('fee_realignment')).toContain('realignmentTitle');
    expect(transferApplyContinueLabelKey('fee_realignment')).toContain('continueToConfirmRealignment');
    expect(transferApplyOperationLabelKey('fee_realignment')).toContain('operationRealignment');
    expect(transferApplyConfirmLabelKey('fee_realignment')).toContain('confirmRealignment');
    expect(
      transferApplySuccessMessageKey({
        moved_fee_ids: [2910],
        preserved_fee_ids: [],
        blocked_fee_ids: [],
        warnings: [],
        operation_kind: 'fee_realignment',
      }),
    ).toContain('successRealignment');
  });

  it('maps error recovery without auto retry POST', () => {
    expect(applyErrorRecoveryAction('preview_stale')).toBe('refresh_preview');
    expect(applyErrorRecoveryAction('fee_ids_not_eligible')).toBe('clear_selection');
  });
});

describe('ApplySubmitGuard', () => {
  it('allows exactly one acquire until release', () => {
    const guard = new ApplySubmitGuard();
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.tryAcquire()).toBe(false);
    guard.release();
    expect(guard.tryAcquire()).toBe(true);
  });
});

function userWithPermissions(permissions: string[]): CurrentUser {
  return {
    id: 1,
    login: 'qa',
    name: 'QA',
    email: 'qa@test.local',
    role: 'admin',
    school: { id: 1, name: 'school' },
    permissions,
    roles: [],
  } as CurrentUser;
}

describe('billing membership permissions', () => {
  it('viewer cannot manage apply workflow', () => {
    expect(canManageBillingMembership(userWithPermissions(['finance.view']))).toBe(false);
  });

  it('manager can manage apply workflow', () => {
    expect(
      canManageBillingMembership(userWithPermissions(['finance.manage_billing_membership'])),
    ).toBe(true);
  });
});
