import { describe, expect, it } from 'vitest';
import { calculateMonthPaymentProgress, deriveStudentMonthlyAllocation } from './monthly-installment-progress';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
const rows: StudentInstallment[] = [
  { id: 12, due_date: '2027-01-05', confirmed_paid_amount: 400, remaining_amount: 2100, timing_status: 'due', payment_status: 'partially_paid' },
  { id: 13, due_date: '2027-02-05', confirmed_paid_amount: 0, remaining_amount: 2100, timing_status: 'upcoming', payment_status: 'unpaid' },
];
describe('student drawer amount ↔ allocations and monthly progress', () => {
  it('typing 1500 proposes the oldest-first January allocation', () => {
    expect(deriveStudentMonthlyAllocation('1500',rows)).toEqual({allocations:{12:'1500.00'},selectedIds:[12]});
  });
  it('respects eligible installments and caps allocation at remaining due', () => {
    expect(deriveStudentMonthlyAllocation('6000',rows).allocations).toEqual({12:'2100.00',13:'2100.00'});
  });
  it('does not propose allocations for zero or invalid input', () => {
    expect(deriveStudentMonthlyAllocation('',rows).selectedIds).toEqual([]);
    expect(deriveStudentMonthlyAllocation('-10',rows).allocations).toEqual({});
  });
  it('distinguishes confirmed from unconfirmed partial collection', () => {
    const progress=calculateMonthPaymentProgress([rows[0]],{12:'1500'});
    expect(progress.available).toBe(true);
    expect(progress.confirmedPercent).toBe(16);
    expect(progress.proposedPercent).toBe(60);
    expect(progress.afterPercent).toBe(76);
  });
  it('does not fabricate percent where historical paid is not supplied', () => {
    expect(calculateMonthPaymentProgress([{id:77,remaining_amount:100}],{}).available).toBe(false);
  });
  it('caps proposed percentage at remaining fraction', () => {
    const progress=calculateMonthPaymentProgress([rows[0]],{12:'3000'});
    expect(progress.afterPercent).toBe(100);
    expect(progress.proposedPercent).toBe(84);
  });
});
