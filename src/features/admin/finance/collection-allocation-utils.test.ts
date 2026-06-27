import { describe, expect, it } from 'vitest';
import { buildAllocationPayload, validateAllocationTotals } from './collection-allocation-utils';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

describe('collection allocation payload', () => {
  it('builds official installment allocations', () => {
    const installments: StudentInstallment[] = [
      { id: 1001, remaining_amount: 2500, fee_id: 10 },
      { id: 1002, remaining_amount: 2000, fee_id: 11 },
    ];
    const lines = buildAllocationPayload(
      { 1001: '2500', 1002: '2000' },
      installments,
    );
    expect(lines).toEqual([
      { installment_id: 1001, student_fee_id: 10, amount: 2500 },
      { installment_id: 1002, student_fee_id: 11, amount: 2000 },
    ]);
  });
});

describe('manual allocation guards for advance payment / credit balance', () => {
  const installments: StudentInstallment[] = [
    { id: 1, remaining_amount: 2000, fee_id: 10, timing_status: 'overdue', payment_status: 'unpaid' },
    { id: 2, remaining_amount: 2000, fee_id: 11, timing_status: 'due', payment_status: 'unpaid' },
  ];

  it('allows allocation sum LESS than the payment amount (difference becomes credit)', () => {
    const lines = buildAllocationPayload({ 1: '2000' }, installments);
    const result = validateAllocationTotals({
      collectionAmount: 10000,
      allocatedAmount: 2000,
      lines,
      installments,
    });
    expect(result).toBeNull();
  });

  it('blocks allocation sum GREATER than the payment amount', () => {
    const lines = buildAllocationPayload({ 1: '2000', 2: '2000' }, installments);
    const result = validateAllocationTotals({
      collectionAmount: 3000,
      allocatedAmount: 4000,
      lines,
      installments,
    });
    expect(result).toBe('allocationExceedsCollection');
  });

  it('blocks an allocation that exceeds the installment remaining', () => {
    const lines = buildAllocationPayload({ 1: '5000' }, installments);
    const result = validateAllocationTotals({
      collectionAmount: 5000,
      allocatedAmount: 5000,
      lines,
      installments,
    });
    expect(result).toBe('allocationExceedsReceivable');
  });
});
