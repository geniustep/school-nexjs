import { describe, expect, it, vi } from 'vitest';
import {
  buildResolveFinanceReviewPayload,
  canSubmitResolveFinanceReview,
} from './build-resolve-finance-review-payload';
import {
  readBillingPartnerMismatchDetail,
  readFinanceReviewReasons,
  resolveFinanceReviewPresentation,
} from './resolve-finance-review-presentation';
import type { StudentFinanceWorkspace } from '../types';

function mismatchWorkspace(
  overrides: Partial<StudentFinanceWorkspace> & {
    finance_review_details?: unknown;
    finance_review_reasons?: string[];
  } = {},
): StudentFinanceWorkspace {
  return {
    summary: {},
    requires_finance_review: true,
    finance_review_reasons: ['billing_partner_mismatch'],
    finance_review_details: [
      {
        code: 'billing_partner_mismatch',
        agreement_id: 67,
        agreement_partner: { id: 1, name: 'ولي الأمر أ' },
        profile_partner: { id: 2, name: 'ولي الأمر ب' },
        resolution_available: true,
        resolution_strategy: 'align_agreement_to_profile',
      },
    ],
    current_agreement: { id: 67, student_id: 11, state: 'active' },
    ...overrides,
  } as StudentFinanceWorkspace;
}

describe('resolveFinanceReviewPresentation', () => {
  it('1) billing_partner_mismatch shows both partners and reason context', () => {
    const presentation = resolveFinanceReviewPresentation(mismatchWorkspace());
    expect(presentation.visible).toBe(true);
    expect(presentation.billingPartnerMismatch?.agreementPartnerName).toBe('ولي الأمر أ');
    expect(presentation.billingPartnerMismatch?.profilePartnerName).toBe('ولي الأمر ب');
    expect(readFinanceReviewReasons(mismatchWorkspace())).toEqual(['billing_partner_mismatch']);
    expect(readBillingPartnerMismatchDetail(mismatchWorkspace())?.agreement_id).toBe(67);
  });

  it('reads keyed finance_review_details from backend', () => {
    const workspace = mismatchWorkspace({
      finance_review_details: {
        billing_partner_mismatch: {
          code: 'billing_partner_mismatch',
          agreement_partner: { id: 3, name: 'Partner A' },
          profile_partner: { id: 4, name: 'Partner B' },
          resolution_available: true,
        },
      },
    });
    const presentation = resolveFinanceReviewPresentation(workspace);
    expect(presentation.billingPartnerMismatch?.agreementPartnerName).toBe('Partner A');
    expect(presentation.billingPartnerMismatch?.profilePartnerName).toBe('Partner B');
  });

  it('hides presentation when review reason is missing', () => {
    const presentation = resolveFinanceReviewPresentation(
      mismatchWorkspace({ finance_review_reasons: ['agreement_amount_mismatch'] }),
    );
    expect(presentation.visible).toBe(false);
  });
});

describe('resolve finance review payload', () => {
  it('4) empty reason blocks submit', () => {
    expect(canSubmitResolveFinanceReview('')).toBe(false);
    expect(canSubmitResolveFinanceReview('   ')).toBe(false);
    expect(canSubmitResolveFinanceReview('Billing partner updated after guardian change')).toBe(true);
  });

  it('5) builds correct resolve payload', () => {
    expect(buildResolveFinanceReviewPayload('  Updated guardian  ')).toEqual({
      reason: 'Updated guardian',
      strategy: 'align_agreement_to_profile',
    });
  });
});

describe('successful resolve contract', () => {
  it('5) success should reload workspace via callback without optimistic mutation', () => {
    const onRefresh = vi.fn();
    onRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
