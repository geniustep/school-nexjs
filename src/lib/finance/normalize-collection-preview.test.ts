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
