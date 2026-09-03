import { describe, expect, it } from 'vitest';
import { groupInstallmentsByMonth } from './monthly-installment-picker';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

describe('monthly installment picker', () => {
  it('groups installments by due month and keeps the earliest month first', () => {
    const installments: StudentInstallment[] = [
      { id: 2, due_date: '2026-10-05', remaining_amount: 100 },
      { id: 1, due_date: '2026-09-05', remaining_amount: 100 },
      { id: 3, due_date: '2026-10-12', remaining_amount: 100 },
    ];

    const groups = groupInstallmentsByMonth(installments, 'ar');

    expect(groups.map((group) => group.key)).toEqual(['2026-09', '2026-10']);
    expect(groups[1]?.installments.map((row) => row.id)).toEqual([2, 3]);
  });

  it('keeps an undated installment in its own visible group', () => {
    const groups = groupInstallmentsByMonth(
      [{ id: 7, period_label: 'رسم التسجيل', remaining_amount: 500 }],
      'ar',
    );

    expect(groups[0]?.label).toBe('رسم التسجيل');
  });
});
