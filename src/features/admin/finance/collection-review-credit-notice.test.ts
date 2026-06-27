import { describe, expect, it } from 'vitest';
import { resolveReviewCreditNotice } from './collection-review-credit-notice';
import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';

function makePreview(overrides: Partial<PaymentCollectionPreview>): PaymentCollectionPreview {
  return {
    amount: 0,
    prepayment_allowed: true,
    remaining_total: 0,
    allocated_amount: 0,
    unallocated_amount: 0,
    resulting_credit_balance: 0,
    credit_amount: 0,
    allocations: [],
    warnings: [],
    errors: [],
    payment_summary: null,
    allocation_summary: null,
    allowed_actions: null,
    is_valid: true,
    is_prepayment: false,
    ...overrides,
  } as PaymentCollectionPreview;
}

describe('resolveReviewCreditNotice', () => {
  it('shows the notice when there is an unallocated credit balance (10000/2000/8000)', () => {
    const notice = resolveReviewCreditNotice(
      makePreview({
        amount: 10000,
        allocated_amount: 2000,
        unallocated_amount: 8000,
        resulting_credit_balance: 8000,
        allocations: [{ installment_id: 1, amount: 2000, status_after: 'partial' }],
        warnings: ['This payment will create a credit balance.'],
        allowed_actions: {
          can_confirm_with_credit_balance: true,
          can_allocate_to_future_installments: true,
        },
        payment_summary: {
          amount_paid: 10000,
          allocated_amount: 2000,
          unallocated_amount: 8000,
          resulting_credit_balance: 8000,
        },
      }),
    );
    expect(notice).not.toBeNull();
    expect(notice?.amountPaid).toBe(10000);
    expect(notice?.allocatedAmount).toBe(2000);
    expect(notice?.unallocatedAmount).toBe(8000);
    expect(notice?.resultingCreditBalance).toBe(8000);
  });

  it('returns null when fully allocated (10000/10000/0) so no credit card is shown', () => {
    const notice = resolveReviewCreditNotice(
      makePreview({
        amount: 10000,
        allocated_amount: 10000,
        unallocated_amount: 0,
        resulting_credit_balance: 0,
        allocations: [{ installment_id: 1, amount: 10000, status_after: 'paid' }],
        payment_summary: {
          amount_paid: 10000,
          allocated_amount: 10000,
          unallocated_amount: 0,
          resulting_credit_balance: 0,
        },
      }),
    );
    expect(notice).toBeNull();
  });

  it('returns null for a null preview', () => {
    expect(resolveReviewCreditNotice(null)).toBeNull();
  });

  it('passes through Odoo warnings and the confirm flag without recomputing money', () => {
    const notice = resolveReviewCreditNotice(
      makePreview({
        amount: 5000,
        allocated_amount: 0,
        unallocated_amount: 5000,
        resulting_credit_balance: 5000,
        warnings: ['credit warning'],
        allowed_actions: {
          can_confirm_with_credit_balance: true,
          can_allocate_to_future_installments: false,
        },
      }),
    );
    expect(notice?.warnings).toEqual(['credit warning']);
    expect(notice?.canConfirmWithCreditBalance).toBe(true);
  });
});
