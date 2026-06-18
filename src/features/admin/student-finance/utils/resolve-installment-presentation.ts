import type { StudentInstallment } from '../types';

export function hasInstallmentPendingChequeCoverage(row: StudentInstallment): boolean {
  return (
    (row.pending_cheque_amount ?? 0) > 0 ||
    row.payment_status === 'pending_cheque'
  );
}

/** Never treat zero paid + positive remaining as paid. */
export function resolveEffectiveInstallmentPaymentStatus(row: StudentInstallment): string {
  const paid = row.confirmed_paid_amount ?? 0;
  const remaining = row.remaining_amount ?? 0;

  if (paid <= 0 && remaining > 0) {
    if (hasInstallmentPendingChequeCoverage(row)) return 'pending_cheque';
    if (row.payment_status === 'partially_paid') return 'partially_paid';
    return 'unpaid';
  }

  if (remaining <= 0 && paid > 0) return 'paid';
  if (paid > 0 && remaining > 0) return 'partially_paid';
  if (row.payment_status === 'paid' && paid <= 0) return 'unpaid';

  return row.payment_status ?? 'unpaid';
}

/** Overdue timing is suppressed when coverage is pending cheque — show coverage instead. */
export function resolveEffectiveInstallmentTimingStatus(row: StudentInstallment): string | null {
  if (hasInstallmentPendingChequeCoverage(row)) {
    return null;
  }
  return row.timing_status ?? 'not_applicable';
}

export function isInstallmentOverdueForSummary(row: StudentInstallment): boolean {
  if (hasInstallmentPendingChequeCoverage(row)) return false;
  return row.timing_status === 'overdue';
}

export function isInstallmentPaidForSummary(row: StudentInstallment): boolean {
  const paid = row.confirmed_paid_amount ?? 0;
  const remaining = row.remaining_amount ?? 0;
  return paid > 0 && remaining <= 0 && row.payment_status === 'paid';
}
