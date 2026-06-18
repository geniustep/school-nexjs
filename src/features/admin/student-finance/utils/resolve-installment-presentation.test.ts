import { describe, expect, it } from 'vitest';
import type { StudentInstallment } from '../types';
import {
  hasInstallmentPendingChequeCoverage,
  isInstallmentOverdueForSummary,
  isInstallmentPaidForSummary,
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
});
