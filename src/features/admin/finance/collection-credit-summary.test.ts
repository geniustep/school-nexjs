import { describe, expect, it } from 'vitest';
import { normalizePaymentCollectionPreview } from '@/lib/finance/normalize-collection-preview';
import { resolveCollectionCreditSummary } from './collection-credit-summary';

/** Mirrors the live Odoo advance-payment / credit-balance preview contract on `school`. */
function partialAllocationPreview() {
  return normalizePaymentCollectionPreview({
    payment_amount: 10000,
    amount: 10000,
    allocated_amount: 2000,
    unallocated_amount: 8000,
    resulting_credit_balance: 8000,
    credit_amount: 0,
    allocations: [
      { installment_id: 14181, student_fee_id: 4605, amount: 2000, allocated_amount: 2000, status_after: 'paid', is_future_allocation: true },
    ],
    warnings: [],
    errors: [],
    payment_summary: {
      amount_paid: 10000,
      allocated_amount: 2000,
      unallocated_amount: 8000,
      resulting_credit_balance: 8000,
    },
    allocation_summary: { mode: 'selected_installments', allocations_count: 1, future_allocations_count: 1 },
    allowed_actions: { can_confirm_with_credit_balance: true, can_allocate_to_future_installments: true },
    prepayment_allowed: true,
    remaining_total: 29000,
  });
}

describe('resolveCollectionCreditSummary', () => {
  it('exposes allocated, unallocated and resulting credit balance from the preview', () => {
    const summary = resolveCollectionCreditSummary(partialAllocationPreview());
    expect(summary).not.toBeNull();
    expect(summary?.amountPaid).toBe(10000);
    expect(summary?.allocatedAmount).toBe(2000);
    expect(summary?.unallocatedAmount).toBe(8000);
    expect(summary?.resultingCreditBalance).toBe(8000);
    expect(summary?.hasCreditBalance).toBe(true);
    expect(summary?.canConfirmWithCreditBalance).toBe(true);
  });

  it('flags a full credit balance when nothing is allocated', () => {
    const preview = normalizePaymentCollectionPreview({
      payment_amount: 5000,
      amount: 5000,
      allocated_amount: 0,
      unallocated_amount: 5000,
      resulting_credit_balance: 5000,
      credit_amount: 0,
      allocations: [],
      warnings: [],
      errors: [],
      payment_summary: {
        amount_paid: 5000,
        allocated_amount: 0,
        unallocated_amount: 5000,
        resulting_credit_balance: 5000,
      },
      allowed_actions: { can_confirm_with_credit_balance: true },
      prepayment_allowed: true,
      remaining_total: 12000,
    });
    const summary = resolveCollectionCreditSummary(preview);
    expect(summary?.allocatedAmount).toBe(0);
    expect(summary?.unallocatedAmount).toBe(5000);
    expect(summary?.resultingCreditBalance).toBe(5000);
    expect(summary?.hasCreditBalance).toBe(true);
    expect(summary?.isFullCreditBalance).toBe(true);
  });

  it('reports no credit balance when the payment is fully allocated', () => {
    const preview = normalizePaymentCollectionPreview({
      payment_amount: 10000,
      amount: 10000,
      allocated_amount: 10000,
      unallocated_amount: 0,
      resulting_credit_balance: 0,
      credit_amount: 0,
      allocations: [
        { installment_id: 1, amount: 2000, allocated_amount: 2000, status_after: 'paid' },
        { installment_id: 2, amount: 8000, allocated_amount: 8000, status_after: 'paid' },
      ],
      warnings: [],
      errors: [],
      payment_summary: { amount_paid: 10000, allocated_amount: 10000, unallocated_amount: 0, resulting_credit_balance: 0 },
      allowed_actions: { can_confirm_with_credit_balance: true },
      prepayment_allowed: true,
      remaining_total: 19000,
    });
    const summary = resolveCollectionCreditSummary(preview);
    expect(summary?.hasCreditBalance).toBe(false);
    expect(summary?.isFullCreditBalance).toBe(false);
    expect(summary?.resultingCreditBalance).toBe(0);
  });

  it('does not derive a credit balance for a partial single-installment payment', () => {
    // Scenario 4: 1000 paid against a 2000 installment → partially paid, no credit.
    const preview = normalizePaymentCollectionPreview({
      payment_amount: 1000,
      amount: 1000,
      allocated_amount: 1000,
      unallocated_amount: 0,
      resulting_credit_balance: 0,
      credit_amount: 0,
      allocations: [
        { installment_id: 7, amount: 1000, allocated_amount: 1000, status_after: 'partial' },
      ],
      warnings: [],
      errors: [],
      payment_summary: { amount_paid: 1000, allocated_amount: 1000, unallocated_amount: 0, resulting_credit_balance: 0 },
      allowed_actions: { can_confirm_with_credit_balance: true },
      prepayment_allowed: true,
      remaining_total: 1000,
    });
    const summary = resolveCollectionCreditSummary(preview);
    expect(summary?.hasCreditBalance).toBe(false);
    expect(summary?.resultingCreditBalance).toBe(0);
    // Installment stays partial — credit never marks it paid.
    expect(preview?.allocations[0].status_after).toBe('partial');
  });

  it('passes through Odoo warnings without recomputing them', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 5000,
      allocated_amount: 0,
      unallocated_amount: 5000,
      resulting_credit_balance: 5000,
      allocations: [],
      warnings: ['credit_balance_not_reducing_dues'],
      errors: [],
      allowed_actions: { can_confirm_with_credit_balance: true },
    });
    const summary = resolveCollectionCreditSummary(preview);
    expect(summary?.warnings).toEqual(['credit_balance_not_reducing_dues']);
  });

  it('returns null for a missing preview', () => {
    expect(resolveCollectionCreditSummary(null)).toBeNull();
  });
});
