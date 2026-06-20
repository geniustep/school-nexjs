import { describe, expect, it } from 'vitest';
import type { StudentInstallment } from '../types';
import {
  computeScheduleSummaryCounts,
  hasInstallmentPendingChequeCoverage,
  isInstallmentDueNowForSummary,
  isInstallmentOverdueForSummary,
  isInstallmentPaidForSummary,
  isInstallmentUpcomingForSummary,
  resolveAdminInstallmentTimingDisplayStatus,
  resolveEffectiveInstallmentPaymentStatus,
  resolveEffectiveInstallmentTimingStatus,
} from './resolve-installment-presentation';

function row(partial: Partial<StudentInstallment>): StudentInstallment {
  return {
    id: 1,
    amount: 2500,
    remaining_amount: 2500,
    confirmed_paid_amount: 0,
    payment_status: 'paid',
    timing_status: 'overdue',
    ...partial,
  };
}

describe('resolve-installment-presentation', () => {
  it('does not show paid when confirmed paid is zero and remaining is positive', () => {
    const installment = row({ payment_status: 'paid' });
    expect(resolveEffectiveInstallmentPaymentStatus(installment)).toBe('unpaid');
    expect(isInstallmentPaidForSummary(installment)).toBe(false);
  });

  it('shows pending cheque coverage instead of overdue timing', () => {
    const installment = row({ pending_cheque_amount: 2500, payment_status: 'paid' });
    expect(hasInstallmentPendingChequeCoverage(installment)).toBe(true);
    expect(resolveEffectiveInstallmentPaymentStatus(installment)).toBe('pending_cheque');
    expect(resolveEffectiveInstallmentTimingStatus(installment)).toBeNull();
    expect(isInstallmentOverdueForSummary(installment)).toBe(false);
  });

  it('counts only truly paid installments in summary', () => {
    const paid = row({
      payment_status: 'paid',
      confirmed_paid_amount: 2500,
      remaining_amount: 0,
    });
    expect(isInstallmentPaidForSummary(paid)).toBe(true);
  });

  it('maps backend hidden timing to upcoming for admin display', () => {
    expect(resolveAdminInstallmentTimingDisplayStatus('hidden')).toBe('upcoming');
    expect(resolveAdminInstallmentTimingDisplayStatus('due')).toBe('due');
    expect(resolveAdminInstallmentTimingDisplayStatus(null)).toBeNull();
  });

  it('counts hidden timing as not yet due in schedule summary', () => {
    const hidden = row({ payment_status: 'unpaid', timing_status: 'hidden', sequence: 10 });
    expect(isInstallmentUpcomingForSummary(hidden)).toBe(true);
    const due = row({ payment_status: 'unpaid', timing_status: 'due' });
    expect(isInstallmentUpcomingForSummary(due)).toBe(false);
  });

  it('counts registration hidden tranche as due now when collect is allowed', () => {
    const registration = row({
      id: 1,
      payment_status: 'unpaid',
      timing_status: 'hidden',
      sequence: 1,
      allowed_actions: { collect: true },
    });
    const recurring = row({
      id: 2,
      payment_status: 'unpaid',
      timing_status: 'hidden',
      sequence: 10,
      amount: 1300,
      allowed_actions: { collect: true },
    });
    const ctx = { canCollect: true, minUnpaidSequence: 1 };
    expect(isInstallmentDueNowForSummary(registration, ctx)).toBe(true);
    expect(isInstallmentDueNowForSummary(recurring, ctx)).toBe(false);
  });

  it('summarizes 21 installments as 1 due now and 20 not yet due', () => {
    const rows = [
      row({
        id: 1,
        payment_status: 'unpaid',
        timing_status: 'hidden',
        sequence: 1,
        amount: 2500,
        allowed_actions: { collect: true },
      }),
      ...Array.from({ length: 20 }, (_, i) =>
        row({
          id: i + 2,
          payment_status: 'unpaid',
          timing_status: 'hidden',
          sequence: 10 + i,
          amount: i % 2 === 0 ? 1300 : 400,
          allowed_actions: { collect: true },
        }),
      ),
    ];
    expect(computeScheduleSummaryCounts(rows, true)).toEqual({
      paid: 0,
      dueNow: 1,
      overdue: 0,
      upcoming: 20,
    });
  });

  it('excludes paid and zero-remaining installments from due now', () => {
    const paid = row({
      payment_status: 'paid',
      timing_status: 'due',
      confirmed_paid_amount: 2500,
      remaining_amount: 0,
      sequence: 1,
    });
    const settled = row({
      payment_status: 'unpaid',
      timing_status: 'due',
      remaining_amount: 0,
      sequence: 2,
    });
    expect(
      isInstallmentDueNowForSummary(paid, { canCollect: true, minUnpaidSequence: 1 }),
    ).toBe(false);
    expect(
      isInstallmentDueNowForSummary(settled, { canCollect: true, minUnpaidSequence: 2 }),
    ).toBe(false);
  });
});
