import { describe, expect, it } from 'vitest';
import {
  isInvalidDisplayToken,
  mergeCreateCollectionResponse,
  resolveCollectionSuccessAmount,
  resolveCollectionSuccessPaymentMethod,
  resolveCollectionSuccessSummary,
} from './resolve-collection-success-summary';
import type { PaymentCollection } from '@/types/finance';

describe('resolveCollectionSuccessSummary', () => {
  it('does not surface undefined# style reference tokens', () => {
    const summary = resolveCollectionSuccessSummary({
      id: undefined as unknown as number,
      reference: undefined,
      name: undefined,
      receipt_number: 'REC/RAQEEM/2026/000020',
      allocated_amount: 2500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 1, amount: 2500 }],
    } as PaymentCollection);

    expect(summary.receiptNumber).toBe('REC/RAQEEM/2026/000020');
    expect(summary.referenceLabel).toBeNull();
    expect(JSON.stringify(summary.fields)).not.toContain('undefined#');
    expect(JSON.stringify(summary.fields)).not.toContain('#undefined');
  });

  it('shows receipt number when present on wrapped response', () => {
    const { collection, fallback } = mergeCreateCollectionResponse({
      collection: { id: 42, allocated_amount: 2500 } as PaymentCollection,
      receipt_number: 'REC/RAQEEM/2026/000020',
      receipt_id: 99,
    });
    const summary = resolveCollectionSuccessSummary(collection, fallback);
    expect(summary.receiptNumber).toBe('REC/RAQEEM/2026/000020');
    expect(summary.receiptId).toBe(99);
  });

  it('falls back to submitted amount when response amount is missing', () => {
    const amount = resolveCollectionSuccessAmount(
      { id: 1, allocated_amount: 2500 } as PaymentCollection,
      { amount: 2500 },
    );
    expect(amount).toBe(2500);
  });

  it('falls back to submitted payment method when response is missing', () => {
    const method = resolveCollectionSuccessPaymentMethod({ id: 1 } as PaymentCollection, {
      paymentMethod: 'cash',
    });
    expect(method).toBe('cash');
  });

  it('hides invalid reference values instead of rendering placeholders', () => {
    expect(isInvalidDisplayToken('undefined#')).toBe(true);
    expect(isInvalidDisplayToken('#undefined')).toBe(true);
    expect(isInvalidDisplayToken('REC/001')).toBe(false);

    const summary = resolveCollectionSuccessSummary({
      id: 10,
      reference: 'undefined',
      receipt_number: 'REC/001',
      amount: 2500,
      payment_method: 'cash',
      allocated_amount: 2500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 1, amount: 2500 }],
    } as PaymentCollection);

    expect(summary.fields.some((field) => field.key === 'reference')).toBe(false);
    expect(summary.fields.some((field) => field.key === 'amount')).toBe(true);
    expect(summary.fields.some((field) => field.key === 'paymentMethod')).toBe(true);
  });

  it('keeps allocation rows when allocations exist', () => {
    const summary = resolveCollectionSuccessSummary({
      id: 11,
      receipt_number: 'REC/002',
      amount: 2500,
      payment_method: 'cash',
      allocated_amount: 2500,
      unallocated_amount: 0,
      allocations: [{ installment_id: 1, amount: 2500 }],
    } as PaymentCollection);

    expect(summary.allocationCount).toBe(1);
    expect(summary.fields.some((field) => field.key === 'allocated')).toBe(true);
    expect(summary.fields.some((field) => field.key === 'unallocated')).toBe(true);
  });
});
