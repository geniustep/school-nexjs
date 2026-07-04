import { describe, expect, it, vi } from 'vitest';
import {
  readSscErrorDetails,
  resolveFinanceReviewErrorMessage,
  resolveFinanceReviewErrorMessageKey,
} from './resolve-finance-review-errors';
import { resolveAgreementAmendmentErrorMessage } from './agreement-amendment-errors';
import { normalizeAgreementAmendmentPreview } from './normalize-agreement-amendment-preview';

const t = (key: string) => key;

describe('resolveFinanceReviewErrorMessage', () => {
  it('6) maps failed resolve codes to human messages', () => {
    expect(resolveFinanceReviewErrorMessageKey('finance_review_reason_required')).toContain(
      'reasonRequired',
    );
    expect(resolveFinanceReviewErrorMessageKey('finance_review_not_resolvable')).toContain(
      'notResolvable',
    );
    expect(resolveFinanceReviewErrorMessageKey('billing_partner_reconciliation_no_mismatch')).toContain(
      'noMismatch',
    );
    expect(resolveFinanceReviewErrorMessageKey('finance_review_sync_failed')).toContain(
      'syncFailed',
    );
    expect(
      resolveFinanceReviewErrorMessage('finance_review_not_resolvable', undefined, (key) =>
        key.endsWith('notResolvable') ? 'لا يمكن الحل' : key,
      ),
    ).toBe('لا يمكن الحل');
  });
});

describe('amendment_not_allowed ssc_details', () => {
  it('8) reads ssc_details and surfaces finance review blockers', () => {
    const details = readSscErrorDetails({
      code: 'amendment_not_allowed',
      message: 'raw',
      details: {
        ssc_details: {
          amend_block_code: 'finance_review_required',
          finance_review_reasons: ['billing_partner_mismatch'],
          blocking_reasons: ['amendment_not_allowed'],
        },
      },
    });
    expect(details.amendBlockCode).toBe('finance_review_required');
    expect(details.financeReviewReasons).toEqual(['billing_partner_mismatch']);
    expect(details.blockingReasons).toEqual(['amendment_not_allowed']);

    const message = resolveAgreementAmendmentErrorMessage(
      'amendment_not_allowed',
      'raw',
      t,
      {
        code: 'amendment_not_allowed',
        message: 'raw',
        details: {
          ssc_details: {
            finance_review_reasons: ['billing_partner_mismatch'],
          },
        },
      },
    );
    expect(message).toContain('billingPartnerMismatchReason');
  });
});

describe('amendment preview can_apply', () => {
  it('7) can_apply=false blocks apply even when allowed=true', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      can_apply: false,
      blocking_reasons: ['finance_review_required'],
      amend_block_code: 'finance_review_required',
      finance_review_reasons: ['billing_partner_mismatch'],
    });
    expect(normalized.canApply).toBe(false);
    expect(normalized.blockingReasons).toEqual([{ code: 'finance_review_required' }]);
    expect(normalized.financeReviewReasons).toEqual(['billing_partner_mismatch']);
  });

  it('7b) can_apply=true permits apply', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      can_apply: true,
      blocking_reasons: [],
    });
    expect(normalized.canApply).toBe(true);
    expect(normalized.blockingReasons).toEqual([]);
  });
});

describe('postResolveFinanceReview API contract', () => {
  it('5) uses documented endpoint path', async () => {
    const { endpoints } = await import('@/lib/api/endpoints');
    expect(endpoints.admin.financialAgreementResolveFinanceReview(67)).toBe(
      '/admin/financial-agreements/67/resolve-finance-review',
    );
  });
});
