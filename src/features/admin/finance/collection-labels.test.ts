import { describe, expect, it } from 'vitest';
import {
  collectionAllocationSummary,
  formatInstallmentLabel,
  formatStudentFeeLabel,
} from './collection-labels';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import type { PaymentCollection, StudentFee } from '@/types/finance';

const t = (key: string) =>
  ({
    'admin.finance.studentFee': 'Receivable',
    'admin.finance.dueDate': 'Due',
    'admin.finance.remainingAmount': 'Remaining',
    'admin.finance.collections.allocationNone': 'Unallocated',
    'admin.finance.collections.allocationFull': 'Fully allocated',
    'admin.finance.collections.allocationPartial': 'Partially allocated',
    'admin.finance.collections.allocationCount': '{count} receivables',
  })[key] ?? key;

describe('collection labels', () => {
  it('builds distinct student fee labels from API fields', () => {
    const fee = {
      id: 12,
      name: 'Tuition June',
      due_date: '2026-06-01',
      remaining_amount: 400,
    } as StudentFee;
    expect(formatStudentFeeLabel(fee, t, () => '01/06/2026')).toContain('Tuition June');
    expect(formatStudentFeeLabel(fee, t, () => '01/06/2026')).not.toBe('Receivable');
  });

  it('builds installment label with service and due date', () => {
    const row = {
      id: 1,
      service: { id: 1, name: 'Registration' },
      due_date: '2026-06-01',
      remaining_amount: 300,
    } as StudentInstallment;
    const label = formatInstallmentLabel(row, t, () => '01/06/2026', () => '—');
    expect(label.title).toContain('Registration');
    expect(label.subtitle).toContain('300.00');
  });

  it('summarizes allocation status from collection data', () => {
    const full: PaymentCollection = {
      id: 1,
      amount: 100,
      allocations: [{ amount: 100 }],
    };
    expect(collectionAllocationSummary(full, t)).toBe('Fully allocated');

    const none: PaymentCollection = { id: 2, amount: 100, allocations: [] };
    expect(collectionAllocationSummary(none, t)).toBe('Unallocated');
  });
});
