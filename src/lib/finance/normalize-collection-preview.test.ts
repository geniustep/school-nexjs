import { describe, expect, it } from 'vitest';
import { resolveCollectionGateBlocked } from '@/lib/finance/collection-gate';
import {
  isCollectionPreviewStale,
  normalizePaymentCollectionPreview,
} from '@/lib/finance/normalize-collection-preview';
import { collectionErrorMessageKey } from '@/lib/utils/collection-errors';
import { getCollectionSubmitBlockers } from '@/features/admin/finance/collection-form-validation';

describe('normalizePaymentCollectionPreview', () => {
  it('normalizes partial preview response from backend contract', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 500,
      prepayment_allowed: true,
      remaining_total: 26300,
      allocated_amount: 500,
      unallocated_amount: 0,
      allocations: [
        {
          installment_id: 4596,
          student_fee_id: 2783,
          amount: 500,
          status_after: 'partial',
        },
      ],
      errors: [],
    });

    expect(preview?.is_valid).toBe(true);
    expect(preview?.allocations).toHaveLength(1);
    expect(preview?.allocations[0].status_after).toBe('partial');
    expect(preview?.is_prepayment).toBe(false);
  });

  it('marks multi-installment preview as prepayment', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 5000,
      prepayment_allowed: true,
      remaining_total: 26300,
      allocated_amount: 5000,
      unallocated_amount: 0,
      allocations: [
        { installment_id: 1, amount: 2500, status_after: 'paid' },
        { installment_id: 2, amount: 2500, status_after: 'paid' },
      ],
      errors: [],
    });

    expect(preview?.is_prepayment).toBe(true);
    expect(preview?.allocations).toHaveLength(2);
  });

  it('defaults credit-balance fields to zero for the legacy contract', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 500,
      prepayment_allowed: true,
      remaining_total: 1000,
      allocated_amount: 500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 1, amount: 500, status_after: 'partial' }],
      errors: [],
    });
    expect(preview?.resulting_credit_balance).toBe(0);
    expect(preview?.warnings).toEqual([]);
    expect(preview?.payment_summary?.allocated_amount).toBe(500);
    expect(preview?.is_valid).toBe(true);
  });
});

describe('normalizePaymentCollectionPreview credit balance contract', () => {
  it('keeps allocated=2000, unallocated=8000, resulting_credit_balance=8000', () => {
    const preview = normalizePaymentCollectionPreview({
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
      payment_summary: { amount_paid: 10000, allocated_amount: 2000, unallocated_amount: 8000, resulting_credit_balance: 8000 },
      allocation_summary: { mode: 'selected_installments', allocations_count: 1, future_allocations_count: 1 },
      allowed_actions: { can_confirm_with_credit_balance: true, can_allocate_to_future_installments: true },
      prepayment_allowed: true,
      remaining_total: 29000,
    });

    expect(preview?.allocated_amount).toBe(2000);
    expect(preview?.unallocated_amount).toBe(8000);
    expect(preview?.resulting_credit_balance).toBe(8000);
    expect(preview?.payment_summary?.resulting_credit_balance).toBe(8000);
    expect(preview?.allocations[0].is_future_allocation).toBe(true);
    expect(preview?.is_valid).toBe(true);
  });

  it('allows a full credit-balance payment when Odoo permits confirming credit', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 5000,
      allocated_amount: 0,
      unallocated_amount: 5000,
      resulting_credit_balance: 5000,
      allocations: [],
      warnings: [],
      errors: [],
      payment_summary: { amount_paid: 5000, allocated_amount: 0, unallocated_amount: 5000, resulting_credit_balance: 5000 },
      allowed_actions: { can_confirm_with_credit_balance: true },
      prepayment_allowed: true,
      remaining_total: 12000,
    });
    expect(preview?.allocated_amount).toBe(0);
    expect(preview?.resulting_credit_balance).toBe(5000);
    expect(preview?.is_valid).toBe(true);
  });

  it('blocks a credit-only payment when Odoo does not allow confirming credit', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 5000,
      allocated_amount: 0,
      unallocated_amount: 5000,
      resulting_credit_balance: 5000,
      allocations: [],
      warnings: [],
      errors: [],
      allowed_actions: { can_confirm_with_credit_balance: false },
      prepayment_allowed: true,
      remaining_total: 12000,
    });
    expect(preview?.is_valid).toBe(false);
  });

  it('extracts warning messages whether Odoo sends strings or objects', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 10000,
      allocated_amount: 2000,
      unallocated_amount: 8000,
      resulting_credit_balance: 8000,
      allocations: [{ installment_id: 1, amount: 2000, status_after: 'paid' }],
      warnings: [
        { code: 'payment_creates_credit_balance', message: 'This payment will create a credit balance.', amount: 8000 },
        'plain_warning',
      ],
      errors: [],
      allowed_actions: { can_confirm_with_credit_balance: true },
    });
    expect(preview?.warnings).toEqual([
      'This payment will create a credit balance.',
      'plain_warning',
    ]);
  });

  it('never marks an installment paid from a credit balance (status comes from Odoo)', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 1000,
      allocated_amount: 1000,
      unallocated_amount: 0,
      resulting_credit_balance: 0,
      allocations: [{ installment_id: 7, amount: 1000, status_after: 'partial' }],
      errors: [],
    });
    expect(preview?.allocations[0].status_after).toBe('partial');
    expect(preview?.resulting_credit_balance).toBe(0);
  });
});

describe('collection preview error codes', () => {
  it('maps agreement_not_active', () => {
    expect(collectionErrorMessageKey('agreement_not_active')).toBe(
      'admin.finance.collectionWorkflow.errors.agreementNotActive',
    );
  });

  it('maps amount_exceeds_remaining_balance', () => {
    expect(collectionErrorMessageKey('amount_exceeds_remaining_balance')).toBe(
      'admin.finance.collectionWorkflow.errors.amountExceedsRemainingBalance',
    );
  });

  it('maps remaining_zero equivalents', () => {
    expect(collectionErrorMessageKey('remaining_zero')).toBe(
      'admin.finance.collectionWorkflow.errors.noOpenBalance',
    );
    expect(collectionErrorMessageKey('no_open_balance')).toBe(
      'admin.finance.collectionWorkflow.errors.noOpenBalance',
    );
  });
});

describe('collection preview submit guards', () => {
  const baseInput = {
    hasStudent: true,
    journalId: '1',
    academicYearId: '1',
    billingPartnerId: '1',
    resolvedBillingPartnerId: 1,
    partnersLoading: false,
    partnersLoadFailed: false,
    partnersCount: 1,
    requiresBillingPartnerChoice: false,
    amount: 500,
    paymentMethod: 'cash',
    allowedMethodCodes: ['cash'],
    collectionDate: '2026-06-26',
    isCheque: false,
    chequeNumber: '',
    chequeBank: '',
    chequeHolder: '',
    chequeWrittenDate: '',
    chequePostdated: false,
    chequeDueDate: '',
    reference: '',
    showAllocationStep: false,
    skipAllocation: true,
    allocatedTotal: 0,
    collectionAmount: 500,
    flexiblePrepayment: true,
    previewValid: false,
    collectionBlocked: false,
  };

  it('blocks save when preview is missing', () => {
    const blockers = getCollectionSubmitBlockers(baseInput);
    expect(blockers).toContain('previewRequired');
  });

  it('blocks save when amount changed after preview', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 500,
      prepayment_allowed: true,
      remaining_total: 1000,
      allocated_amount: 500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 1, amount: 500, status_after: 'partial' }],
      errors: [],
    });
    expect(isCollectionPreviewStale(preview, 600)).toBe(true);
  });

  it('blocks save for draft agreement gate', () => {
    const gate = resolveCollectionGateBlocked(
      {
        collect_allowed: false,
        collect_block_reason: 'agreement_not_active',
        collect_block_message: 'blocked',
        prepayment_allowed: false,
      },
      { annual_total: 0, due_to_date: 0, paid: 0, remaining: 0, overdue: 0, upcoming: 0 },
    );
    expect(gate.blocked).toBe(true);
    expect(gate.reasonKey).toBe('admin.finance.collectionWorkflow.errors.agreementNotActive');
  });

  it('blocks save when remaining is zero', () => {
    const gate = resolveCollectionGateBlocked(
      {
        collect_allowed: true,
        prepayment_allowed: true,
      },
      { annual_total: 0, due_to_date: 0, paid: 0, remaining: 0, overdue: 0, upcoming: 0 },
    );
    expect(gate.blocked).toBe(true);
  });
});

describe('no local allocation math in flexible flow guard', () => {
  it('relies on backend allocations only in preview payload shape', () => {
    const preview = normalizePaymentCollectionPreview({
      amount: 500,
      prepayment_allowed: true,
      remaining_total: 1000,
      allocated_amount: 500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 99, amount: 500, status_after: 'partial' }],
      errors: [],
    });
    expect(preview?.allocations[0].amount).toBe(500);
    expect(preview?.allocated_amount).toBe(500);
  });
});
