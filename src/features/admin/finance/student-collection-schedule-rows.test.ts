import { describe, expect, it } from 'vitest';
import { buildStudentCollectionScheduleRows, isStudentCollectionRowSelectable } from './student-collection-schedule-rows';
import { calculateMonthPaymentProgress, deriveStudentMonthlyAllocation } from './monthly-installment-progress';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
const paid: StudentInstallment = {
  id: 1, due_date: '2026-09-05', amount: 2100, remaining_amount: 0,
  confirmed_paid_amount: 2100, payment_status: 'paid', timing_status: 'not_applicable',
};
const january: StudentInstallment = {
  id: 2, due_date: '2027-01-05', amount: 2100, remaining_amount: 2100,
  confirmed_paid_amount: 0, payment_status: 'unpaid', timing_status: 'due',
};
describe('student drawer: historical schedule separate from collectible allocations', () => {
  it('shows paid installments alongside remaining ones', () => {
    const view = buildStudentCollectionScheduleRows([paid, january], [january]);
    expect(view.map(x => x.id)).toEqual([1,2]);
    expect(calculateMonthPaymentProgress([view[0]], {}).confirmedPercent).toBe(100);
    expect(calculateMonthPaymentProgress([view[1]], {}).confirmedPercent).toBe(0);
  });
  it('keeps collectible server values when the schedule snapshot differs', () => {
    const old: StudentInstallment = { ...january, remaining_amount: 2050, confirmed_paid_amount: 50 };
    const open: StudentInstallment = { ...january, remaining_amount: 2100 };
    expect(buildStudentCollectionScheduleRows([paid, old], [open])[1]).toMatchObject({
      remaining_amount: 2100, confirmed_paid_amount: 50,
    });
  });
  it('does not enable a historical due that was not authorized by collectible-items', () => {
    const unapproved: StudentInstallment = { id: 3, remaining_amount: 900, timing_status:'due' };
    expect(isStudentCollectionRowSelectable(unapproved, [2])).toBe(false);
    expect(isStudentCollectionRowSelectable(january, [2])).toBe(true);
    expect(isStudentCollectionRowSelectable(paid, [1,2])).toBe(false);
  });
  it('keeps amount entry restricted to eligible installments', () => {
    const proposal=deriveStudentMonthlyAllocation('1500', [january]);
    expect(proposal.selectedIds).toEqual([2]);
    expect(proposal.allocations).toEqual({ 2: '1500.00' });
    expect(buildStudentCollectionScheduleRows([paid, january], [january])).toHaveLength(2);
  });
  it('falls back to collectible rows without inventing historical payments', () => {
    expect(buildStudentCollectionScheduleRows([], [january])).toEqual([january]);
  });
});
