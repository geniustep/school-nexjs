import { describe, expect, it } from 'vitest';
import { resolveFinanceCollectBlockPresentation } from './resolve-finance-collect-block-presentation';

describe('resolveFinanceCollectBlockPresentation — billing responsibility unresolved', () => {
  it('hides collect button when collect_allowed is false for unresolved billing', () => {
    const presentation = resolveFinanceCollectBlockPresentation({
      workspace: {
        collection_gate: {
          collect_allowed: false,
          collect_block_reason: 'billing_responsibility_unresolved',
        },
        allowed_actions: { collect_payment: false },
      } as never,
      collectBlockReason: 'billing_responsibility_unresolved',
    });
    expect(presentation.shouldHideCollectButton).toBe(true);
    expect(presentation.messageKey).toBe(
      'admin.student360.financeWorkspace.billingResponsibility.unresolved.financeBlocked',
    );
  });

  it('hides collect button when collect block reason is billing_responsibility_required', () => {
    const presentation = resolveFinanceCollectBlockPresentation({
      collectBlockReason: 'billing_responsibility_required',
    });
    expect(presentation.shouldHideCollectButton).toBe(true);
    expect(presentation.messageKey).toBe(
      'admin.student360.financeWorkspace.billingResponsibility.needsSelection.financeBlocked',
    );
  });
});
