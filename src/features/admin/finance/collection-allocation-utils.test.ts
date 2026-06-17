import { describe, expect, it } from 'vitest';
import { buildAllocationPayload } from './collection-allocation-utils';
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
