import { describe, expect, it } from 'vitest';
import { resolveStudentFinanceActionState } from './resolve-student-finance-action-state';
import type { DraftAgreementPresentation } from './resolve-draft-agreement-presentation';
import type { BillingContextPresentation } from './resolve-billing-context-presentation';
import type { ChangePlanEligibility } from './resolve-change-plan-eligibility';
import type { InactiveAgreementPresentation } from './resolve-inactive-agreement-presentation';
import type { StudentFinanceWorkspace } from '../types';

function draft(overrides: Partial<DraftAgreementPresentation> = {}): DraftAgreementPresentation {
  return {
    hasDraftAgreement: false,
    agreementId: null,
    state: null,
    isPlanCustomized: false,
    createsDueAfterConfirmation: false,
    summary: null,
    customizations: [],
    enrollmentCustomizations: [],
    totalsMismatch: false,
    allowedActions: {},
    ...overrides,
  };
}

function billing(overrides: Partial<BillingContextPresentation> = {}): BillingContextPresentation {
  return {
    mode: null,
    hasActiveAgreement: false,
    isOperationalWithoutActiveAgreement: false,
    billingContextMessage: null,
    showRepairCard: false,
    repairRecommendedActionKey: null,
    inactiveAgreement: null,
    collectPaymentAllowed: false,
    collectBlockMessage: null,
    collectBlockMessageKey: null,
    collectBlockReason: null,
    shouldHideCollectButton: false,
    billingContextHeadlineKey: null,
    showNoActiveAgreement: true,
    ...overrides,
  };
}

function eligibility(overrides: Partial<ChangePlanEligibility> = {}): ChangePlanEligibility {
  return {
    hasActiveAgreementInUi: false,
    hasBillableFinanceContext: false,
    hasFinanceAccess: true,
    agreementState: null,
    ...overrides,
  };
}

function inactive(overrides: Partial<InactiveAgreementPresentation> = {}): InactiveAgreementPresentation {
  return {
    showWorkspaceBanner: false,
    showRepairCard: false,
    showReviewAction: false,
    reviewActionKind: 'review',
    hasInactiveAgreementRecord: false,
    ...overrides,
  };
}

describe('resolveStudentFinanceActionState', () => {
  it('1) active agreement → no warning banner, no blocking reason', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing({ hasActiveAgreement: true }),
      eligibility: eligibility({ hasActiveAgreementInUi: true, hasBillableFinanceContext: true }),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('active_agreement');
    expect(state.hasActiveAgreement).toBe(true);
    expect(state.showConsolidatedBanner).toBe(false);
    expect(state.showExecutiveContextHeadline).toBe(true);
    expect(state.primaryAction).toBeNull();
    expect(state.blockingReason).toBeNull();
  });

  it('2) draft agreement only → draft scenario, review primary when no submit action', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft({ hasDraftAgreement: true, agreementId: 115, state: 'draft' }),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('draft_agreement');
    expect(state.hasDraftAgreement).toBe(true);
    expect(state.canActivateAgreement).toBe(false);
    expect(state.primaryAction?.kind).toBe('review_agreement');
    expect(state.secondaryActions).toHaveLength(0);
    expect(state.showConsolidatedBanner).toBe(true);
    expect(state.showExecutiveContextHeadline).toBe(false);
    expect(state.blockingReason).toBe(
      'admin.student360.financeWorkspace.actionState.blockedByDraft',
    );
  });

  it('2b) draft agreement with a safe submit action → activate primary + review secondary', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft({
        hasDraftAgreement: true,
        agreementId: 115,
        state: 'draft',
        allowedActions: { submit: true },
      }),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('draft_agreement');
    expect(state.canActivateAgreement).toBe(true);
    expect(state.primaryAction?.kind).toBe('activate_agreement');
    expect(state.secondaryActions.map((a) => a.kind)).toContain('review_agreement');
  });

  it('3) no active, no draft, no history → no_agreement scenario, no banner', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('no_agreement');
    expect(state.hasHistoricalMovements).toBe(false);
    expect(state.showConsolidatedBanner).toBe(false);
    expect(state.canReviewAgreement).toBe(false);
    expect(state.primaryAction).toBeNull();
  });

  it('3b) no agreement but backend allows creation → create primary action', () => {
    const workspace = { allowed_actions: { create_agreement: true } } as unknown as StudentFinanceWorkspace;
    const state = resolveStudentFinanceActionState({
      workspace,
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('no_agreement');
    expect(state.canCreateAgreement).toBe(true);
    expect(state.primaryAction?.kind).toBe('create_agreement');
  });

  it('4) historical movements without active agreement → history scenario with review primary', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: true }),
    });
    expect(state.scenario).toBe('history_without_active_agreement');
    expect(state.hasHistoricalMovements).toBe(true);
    expect(state.canReviewAgreement).toBe(true);
    expect(state.primaryAction?.kind).toBe('review_agreement');
    expect(state.showConsolidatedBanner).toBe(true);
    expect(state.showExecutiveContextHeadline).toBe(false);
    expect(state.blockingReason).toBe(
      'admin.student360.financeWorkspace.actionState.blockedByNoActive',
    );
  });

  it('4b) Case B: fees/installments but NO agreement record → regularize primary (never review)', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      // No inactive agreement record: there is nothing to "review".
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: false }),
    });
    expect(state.scenario).toBe('history_without_active_agreement');
    expect(state.needsRegularization).toBe(true);
    expect(state.canReviewAgreement).toBe(false);
    expect(state.primaryAction?.kind).toBe('regularize_agreement');
    // The Case B primary must NOT be the "review agreement" label/action.
    expect(state.primaryAction?.kind).not.toBe('review_agreement');
    expect(state.primaryAction?.labelKey).toBe(
      'admin.student360.financeWorkspace.actionState.regularizeAgreement',
    );
  });

  it('4c) Case B: regularize-from-fees flagged when backend exposes the path', () => {
    const workspace = {
      allowed_actions: { create_agreement_from_current_fees: true },
    } as unknown as StudentFinanceWorkspace;
    const state = resolveStudentFinanceActionState({
      workspace,
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: false }),
    });
    expect(state.needsRegularization).toBe(true);
    expect(state.canRegularizeFromFees).toBe(true);
    expect(state.primaryAction?.kind).toBe('regularize_agreement');
  });

  it('5) action unavailable: history scenario without backend create → no create secondary action', () => {
    const state = resolveStudentFinanceActionState({
      workspace: { allowed_actions: {} } as unknown as StudentFinanceWorkspace,
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: true }),
    });
    expect(state.scenario).toBe('history_without_active_agreement');
    expect(state.canCreateAgreement).toBe(false);
    expect(state.secondaryActions).toHaveLength(0);
    expect(state.primaryAction?.kind).toBe('review_agreement');
  });

  it('draft takes priority over historical movements (never shows two warnings)', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft({ hasDraftAgreement: true, agreementId: 9, state: 'draft' }),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: true }),
    });
    expect(state.scenario).toBe('draft_agreement');
  });
});

describe('resolveStudentFinanceActionState — schedule & collection guard', () => {
  it('1) draft agreement only → no collection, draft preview schedule, suppressed amounts', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft({ hasDraftAgreement: true, agreementId: 2, state: 'draft' }),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scheduleMode).toBe('draft_preview');
    expect(state.shouldShowDraftSchedulePreview).toBe(true);
    expect(state.shouldShowOfficialSchedule).toBe(false);
    expect(state.shouldAllowInstallmentCollection).toBe(false);
    expect(state.shouldSuppressExecutiveAmounts).toBe(true);
  });

  it('2) draft agreement + historical installments → still no collection, draft preview', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft({ hasDraftAgreement: true, agreementId: 2, state: 'draft' }),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: true }),
    });
    expect(state.scenario).toBe('draft_agreement');
    expect(state.scheduleMode).toBe('draft_preview');
    expect(state.shouldAllowInstallmentCollection).toBe(false);
    expect(state.shouldSuppressExecutiveAmounts).toBe(true);
  });

  it('3) active agreement → official schedule, collection allowed, amounts shown', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing({ hasActiveAgreement: true }),
      eligibility: eligibility({ hasActiveAgreementInUi: true, hasBillableFinanceContext: true }),
      inactiveAgreement: inactive(),
    });
    expect(state.scheduleMode).toBe('official');
    expect(state.shouldShowOfficialSchedule).toBe(true);
    expect(state.shouldShowDraftSchedulePreview).toBe(false);
    expect(state.shouldAllowInstallmentCollection).toBe(true);
    expect(state.shouldSuppressExecutiveAmounts).toBe(false);
  });

  it('4) no active and no draft → official schedule, no draft preview, amounts shown', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility(),
      inactiveAgreement: inactive(),
    });
    expect(state.scenario).toBe('no_agreement');
    expect(state.scheduleMode).toBe('official');
    expect(state.shouldAllowInstallmentCollection).toBe(true);
    expect(state.shouldSuppressExecutiveAmounts).toBe(false);
  });

  it('5) history without active agreement → official schedule path preserved (no draft preview)', () => {
    const state = resolveStudentFinanceActionState({
      draftPresentation: draft(),
      billingContext: billing(),
      eligibility: eligibility({ hasBillableFinanceContext: true }),
      inactiveAgreement: inactive({ showWorkspaceBanner: true, hasInactiveAgreementRecord: true }),
    });
    expect(state.scenario).toBe('history_without_active_agreement');
    expect(state.scheduleMode).toBe('official');
    expect(state.shouldShowDraftSchedulePreview).toBe(false);
    expect(state.shouldSuppressExecutiveAmounts).toBe(false);
  });
});
