import { describe, expect, it } from 'vitest';
import { resolveBillingContextPresentation } from './resolve-billing-context-presentation';
import {
  resolveBillingResponsibilityPresentation,
  shouldBlockAcademicFlowForBillingResponsibility,
  shouldBlockFinanceOperationsForBillingResponsibility,
} from './resolve-billing-responsibility-presentation';

const workspaceBase = {
  allowed_actions: { collect_payment: true },
  collection_gate: { collect_allowed: true },
} as const;

describe('resolveBillingResponsibilityPresentation', () => {
  it('shows no banner for resolved status', () => {
    const presentation = resolveBillingResponsibilityPresentation({
      workspace: {
        billing_responsibility: { status: 'resolved', mode: 'guardian' },
      } as never,
      canSelectBillingResponsible: true,
    });
    expect(presentation.uxCase).toBe('resolved');
    expect(presentation.showBanner).toBe(false);
    expect(presentation.blocksFinanceOperations).toBe(false);
  });

  it('shows needs_selection warning and CTA when write action exists', () => {
    const presentation = resolveBillingResponsibilityPresentation({
      workspace: {
        billing_responsibility: {
          status: 'needs_selection',
          requires_selection: true,
        },
      } as never,
      canSelectBillingResponsible: true,
    });
    expect(presentation.uxCase).toBe('needs_selection');
    expect(presentation.showBanner).toBe(true);
    expect(presentation.showCta).toBe(true);
    expect(presentation.titleKey).toContain('needsSelection.title');
    expect(presentation.messageKey).toContain('needsSelection.message');
    expect(presentation.blocksFinanceOperations).toBe(true);
  });

  it('hides needs_selection CTA when no write action exists', () => {
    const presentation = resolveBillingResponsibilityPresentation({
      workspace: {
        billing_responsibility: { status: 'needs_selection' },
      } as never,
      canSelectBillingResponsible: false,
    });
    expect(presentation.showCta).toBe(false);
    expect(presentation.ctaKey).toBeNull();
  });

  it('shows unresolved with a distinct message from needs_selection', () => {
    const unresolved = resolveBillingResponsibilityPresentation({
      workspace: {
        billing_responsibility: {
          status: 'unresolved',
          source: 'guardian_unresolved',
        },
      } as never,
      canSelectBillingResponsible: true,
    });
    const needsSelection = resolveBillingResponsibilityPresentation({
      workspace: { billing_responsibility: { status: 'needs_selection' } } as never,
      canSelectBillingResponsible: true,
    });
    expect(unresolved.titleKey).not.toBe(needsSelection.titleKey);
    expect(unresolved.messageKey).not.toBe(needsSelection.messageKey);
    expect(unresolved.blocksFinanceOperations).toBe(true);
  });

  it('shows legacy review warning without finance blocking or CTA', () => {
    const presentation = resolveBillingResponsibilityPresentation({
      workspace: {
        billing_responsibility: {
          status: 'legacy_unknown',
          review_required: true,
          data_quality_flags: ['legacy_import'],
        },
      } as never,
      canSelectBillingResponsible: true,
    });
    expect(presentation.uxCase).toBe('legacy_unknown');
    expect(presentation.showReviewWarning).toBe(true);
    expect(presentation.showCta).toBe(false);
    expect(presentation.blocksFinanceOperations).toBe(false);
  });
});

describe('billing responsibility finance/academic gating', () => {
  it('does not block academic flows for needs_selection', () => {
    const presentation = resolveBillingResponsibilityPresentation({
      workspace: { billing_responsibility: { status: 'needs_selection' } } as never,
    });
    expect(shouldBlockAcademicFlowForBillingResponsibility(presentation)).toBe(false);
  });

  it('blocks finance operations for needs_selection and unresolved', () => {
    const needsSelection = resolveBillingResponsibilityPresentation({
      workspace: { billing_responsibility: { status: 'needs_selection' } } as never,
    });
    const unresolved = resolveBillingResponsibilityPresentation({
      workspace: { billing_responsibility: { status: 'unresolved' } } as never,
    });
    expect(shouldBlockFinanceOperationsForBillingResponsibility(needsSelection)).toBe(true);
    expect(shouldBlockFinanceOperationsForBillingResponsibility(unresolved)).toBe(true);
  });

  it('blocks collect payment in billing context for needs_selection', () => {
    const billingContext = resolveBillingContextPresentation({
      workspace: {
        ...workspaceBase,
        billing_responsibility: { status: 'needs_selection' },
      } as never,
      canCollectCapability: true,
      canSelectBillingResponsible: true,
    });
    expect(billingContext.collectPaymentAllowed).toBe(false);
    expect(billingContext.collectBlockMessageKey).toContain('needsSelection.financeBlocked');
    expect(billingContext.shouldHideCollectButton).toBe(true);
  });

  it('does not block collect payment for legacy_unknown by default', () => {
    const billingContext = resolveBillingContextPresentation({
      workspace: {
        ...workspaceBase,
        billing_responsibility: { status: 'legacy_unknown', review_required: true },
      } as never,
      canCollectCapability: true,
    });
    expect(billingContext.collectPaymentAllowed).toBe(true);
  });
});
