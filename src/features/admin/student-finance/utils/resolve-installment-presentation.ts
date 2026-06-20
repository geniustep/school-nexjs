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

/** Admin UI: backend `hidden` means parent-portal visibility, not admin-hidden — show as upcoming. */
export function resolveAdminInstallmentTimingDisplayStatus(
  timingStatus: string | null | undefined,
): string | null {
  if (timingStatus == null) return null;
  if (timingStatus === 'hidden') return 'upcoming';
  return timingStatus;
}

export function isInstallmentUpcomingForSummary(row: StudentInstallment): boolean {
  if (isInstallmentPaidForSummary(row)) return false;
  if (isInstallmentOverdueForSummary(row)) return false;
  if (hasInstallmentPendingChequeCoverage(row)) return false;
  const timing = row.timing_status;
  if (timing === 'due') return false;
  return timing === 'upcoming' || timing === 'hidden' || timing === 'not_applicable' || !timing;
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

export interface ScheduleSummaryContext {
  canCollect: boolean;
  minUnpaidSequence: number | null;
}

/** Lowest unpaid installment sequence in the schedule — used for admin due-now classification. */
export function resolveMinUnpaidInstallmentSequence(rows: StudentInstallment[]): number | null {
  let min: number | null = null;
  for (const row of rows) {
    if (isInstallmentPaidForSummary(row)) continue;
    if ((row.remaining_amount ?? 0) <= 0) continue;
    if (hasInstallmentPendingChequeCoverage(row)) continue;
    const seq = row.sequence;
    if (seq == null) continue;
    if (min == null || seq < min) min = seq;
  }
  return min;
}

/**
 * Admin schedule summary: collectible now — explicit `due`, or hidden first tranche
 * (e.g. registration) when collect is allowed despite parent-portal timing.
 */
export function isInstallmentDueNowForSummary(
  row: StudentInstallment,
  ctx: ScheduleSummaryContext,
): boolean {
  if (isInstallmentPaidForSummary(row)) return false;
  if (isInstallmentOverdueForSummary(row)) return false;
  if (hasInstallmentPendingChequeCoverage(row)) return false;
  if ((row.remaining_amount ?? 0) <= 0) return false;

  const timing = row.timing_status;
  if (timing === 'due') return true;

  if (
    ctx.canCollect &&
    timing === 'hidden' &&
    ctx.minUnpaidSequence != null &&
    row.sequence === ctx.minUnpaidSequence &&
    row.allowed_actions?.collect === true
  ) {
    return true;
  }

  return false;
}

export function computeScheduleSummaryCounts(
  rows: StudentInstallment[],
  canCollect: boolean,
): { paid: number; dueNow: number; overdue: number; upcoming: number } {
  const ctx: ScheduleSummaryContext = {
    canCollect,
    minUnpaidSequence: resolveMinUnpaidInstallmentSequence(rows),
  };
  let paid = 0;
  let dueNow = 0;
  let overdue = 0;
  let upcoming = 0;
  for (const row of rows) {
    if (isInstallmentPaidForSummary(row)) paid += 1;
    else if (isInstallmentOverdueForSummary(row)) overdue += 1;
    else if (isInstallmentDueNowForSummary(row, ctx)) dueNow += 1;
    else if (isInstallmentUpcomingForSummary(row)) upcoming += 1;
  }
  return { paid, dueNow, overdue, upcoming };
}
