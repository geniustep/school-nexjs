import { describe, expect, it } from 'vitest';
import {
  autoAllocateOldest,
  buildAllocationPayload,
  canAllocateToInstallment,
  sortInstallmentsForAllocation,
  sumAllocationAmounts,
  validateAllocationTotals,
} from './collection-allocation-utils';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

function installment(partial: Partial<StudentInstallment> & { id: number }): StudentInstallment {
  return {
    payment_status: 'unpaid',
    timing_status: 'due',
    allow_early_payment: true,
    remaining_amount: 100,
    ...partial,
  } as StudentInstallment;
}

describe('collection allocation utils', () => {
  it('auto allocates oldest overdue before due', () => {
    const rows = sortInstallmentsForAllocation([
      installment({ id: 2, timing_status: 'due', remaining_amount: 50, due_date: '2026-06-01' }),
      installment({ id: 1, timing_status: 'overdue', remaining_amount: 40, due_date: '2026-05-01' }),
    ]);
    expect(rows[0].id).toBe(1);
    const allocated = autoAllocateOldest(rows, 60);
    expect(Number(allocated[1])).toBe(40);
    expect(Number(allocated[2])).toBe(20);
  });

  it('blocks early payment when not allowed', () => {
    const row = installment({ id: 3, timing_status: 'upcoming', allow_early_payment: false });
    expect(canAllocateToInstallment(row)).toBe(false);
    const err = validateAllocationTotals({
      collectionAmount: 50,
      allocatedAmount: 50,
      lines: [{ installment_id: 3, amount: 50 }],
      installments: [row],
    });
    expect(err).toBe('earlyPaymentNotAllowed');
  });

  it('rejects allocation exceeding collection amount', () => {
    const err = validateAllocationTotals({
      collectionAmount: 100,
      allocatedAmount: 120,
      lines: [{ installment_id: 1, amount: 120 }],
      installments: [installment({ id: 1, remaining_amount: 200 })],
    });
    expect(err).toBe('allocationExceedsCollection');
  });

  it('builds payload and tracks unallocated amount', () => {
    const rows = [installment({ id: 1, remaining_amount: 80 })];
    const values = { 1: '50' };
    expect(sumAllocationAmounts(values)).toBe(50);
    expect(buildAllocationPayload(values, rows)).toEqual([{ installment_id: 1, amount: 50 }]);
  });

  it('supports partial payment below installment remaining', () => {
    const row = installment({ id: 4, remaining_amount: 200 });
    const err = validateAllocationTotals({
      collectionAmount: 75,
      allocatedAmount: 75,
      lines: [{ installment_id: 4, amount: 75 }],
      installments: [row],
    });
    expect(err).toBeNull();
  });
});
