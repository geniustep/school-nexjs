import { describe, expect, it } from 'vitest';
import { changePlanErrorMessageKey } from './change-plan-errors';
import {
  resolveChangePlanVisibility,
  resolvePaymentsExistDisplayHint,
} from './resolve-change-plan-visibility';

describe('resolve-change-plan-visibility', () => {
  it('shows change plan only (no special adjustment) when an active agreement is present', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: { id: 1, state: 'active' } } as never,
        financialOverview: null,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({
      showChangePlan: true,
      showSpecialAdjustment: false,
      showReviewAgreement: false,
      reviewAgreementKind: 'review',
      eligibility: {
        hasActiveAgreementInUi: true,
        hasBillableFinanceContext: false,
        hasFinanceAccess: true,
        agreementState: 'active',
      },
      inactiveAgreement: {
        showWorkspaceBanner: false,
        showRepairCard: false,
        showReviewAction: false,
        reviewActionKind: 'review',
        hasInactiveAgreementRecord: false,
      },
      paymentsExistHint: false,
    });
  });

  it('shows review agreement when billable context exists without an active agreement', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: null,
        financialOverview: {
          counts: { installments_count: 12, fees_count: 2 },
          capabilities: { can_collect: true },
        } as never,
        studentCapabilities: { can_collect_payments: true } as never,
      }),
    ).toEqual({
      showChangePlan: false,
      showSpecialAdjustment: false,
      showReviewAgreement: true,
      reviewAgreementKind: 'review',
      eligibility: {
        hasActiveAgreementInUi: false,
        hasBillableFinanceContext: true,
        hasFinanceAccess: true,
        agreementState: null,
      },
      inactiveAgreement: {
        showWorkspaceBanner: true,
        showRepairCard: false,
        showReviewAction: true,
        reviewActionKind: 'review',
        hasInactiveAgreementRecord: false,
      },
      paymentsExistHint: false,
    });
  });

  it('hides change plan when agreement is manageable but not active in UI eligibility', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: { id: 9, state: 'approved' } } as never,
        financialOverview: null,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({
      showChangePlan: false,
      showSpecialAdjustment: false,
      showReviewAgreement: false,
      reviewAgreementKind: 'review',
      eligibility: {
        hasActiveAgreementInUi: false,
        hasBillableFinanceContext: false,
        hasFinanceAccess: true,
        agreementState: null,
      },
      inactiveAgreement: {
        showWorkspaceBanner: false,
        showRepairCard: false,
        showReviewAction: false,
        reviewActionKind: 'review',
        hasInactiveAgreementRecord: false,
      },
      paymentsExistHint: false,
    });
  });

  it('hides actions without agreement or billable finance context', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: null } as never,
        financialOverview: { counts: { installments_count: 0, fees_count: 0 }, totals: { annual_total: 0 } } as never,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({
      showChangePlan: false,
      showSpecialAdjustment: false,
      showReviewAgreement: false,
      reviewAgreementKind: 'review',
      eligibility: {
        hasActiveAgreementInUi: false,
        hasBillableFinanceContext: false,
        hasFinanceAccess: true,
        agreementState: null,
      },
      inactiveAgreement: {
        showWorkspaceBanner: false,
        showRepairCard: false,
        showReviewAction: false,
        reviewActionKind: 'review',
        hasInactiveAgreementRecord: false,
      },
      paymentsExistHint: false,
    });
  });

  it('surfaces paymentsExistHint as display-only when paid_confirmed > 0', () => {
    const visibility = resolveChangePlanVisibility({
      workspace: { current_agreement: { id: 1, state: 'active' } } as never,
      financialOverview: { totals: { paid_confirmed: 500, paid: 500 } } as never,
      studentCapabilities: { can_assign_fees: true } as never,
    });
    expect(visibility.showChangePlan).toBe(true);
    expect(visibility.showSpecialAdjustment).toBe(false);
    expect(visibility.paymentsExistHint).toBe(true);
  });
});

describe('resolvePaymentsExistDisplayHint', () => {
  it('is true for confirmed paid totals without inventing blockers', () => {
    expect(
      resolvePaymentsExistDisplayHint({
        workspace: null,
        financialOverview: { totals: { paid_confirmed: 10, paid: 0 } } as never,
      }),
    ).toBe(true);
  });
});

describe('change-plan-errors', () => {
  it('maps pending cheque blocker code', () => {
    expect(changePlanErrorMessageKey('plan_change_blocked_by_pending_cheques')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByPendingCheques',
    );
  });

  it('maps forbidden code', () => {
    expect(changePlanErrorMessageKey('forbidden')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.forbidden',
    );
  });

  it('maps legacy_special_adjustment_retired', () => {
    expect(changePlanErrorMessageKey('legacy_special_adjustment_retired')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.legacySpecialAdjustmentRetired',
    );
  });

  it('maps plan_change_blocked_by_payments', () => {
    expect(changePlanErrorMessageKey('plan_change_blocked_by_payments')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByPayments',
    );
  });
});
