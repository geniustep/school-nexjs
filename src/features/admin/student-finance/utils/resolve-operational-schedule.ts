import type { AgreementScheduleItem, FinancialAgreement } from '../types';

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeState(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isCancelledScheduleItem(item: Pick<AgreementScheduleItem, 'state'> | null | undefined): boolean {
  return normalizeState(item?.state) === 'cancelled';
}

/** Defensive filter only — backend schedule_summary remains the official count/total. */
export function filterOperationalInstallments(
  installments: AgreementScheduleItem[] | null | undefined,
): AgreementScheduleItem[] {
  if (!Array.isArray(installments)) return [];
  return installments.filter((item) => !isCancelledScheduleItem(item));
}

export function countCancelledInOperationalInstallments(
  installments: AgreementScheduleItem[] | null | undefined,
): number {
  if (!Array.isArray(installments)) return 0;
  return installments.filter((item) => isCancelledScheduleItem(item)).length;
}

const warnedCancelledPayloads = new WeakSet<object>();

export function warnCancelledInOperationalInstallments(
  installments: AgreementScheduleItem[] | null | undefined,
): void {
  const cancelledCount = countCancelledInOperationalInstallments(installments);
  if (cancelledCount <= 0) return;
  if (process.env.NODE_ENV === 'production') return;
  if (installments && typeof installments === 'object') {
    if (warnedCancelledPayloads.has(installments as object)) return;
    warnedCancelledPayloads.add(installments as object);
  }
  console.warn(
    `[student-finance] Ignoring ${cancelledCount} cancelled installment(s) inside operational installments payload.`,
  );
}

export function resolveCurrentScheduleTotal(
  agreement: Pick<FinancialAgreement, 'schedule_summary' | 'financial_summary'> | null | undefined,
): number | null {
  return (
    readNumber(agreement?.schedule_summary?.total_amount) ??
    readNumber(agreement?.financial_summary?.schedule_total)
  );
}

export function resolveCurrentInstallmentCount(
  agreement: Pick<FinancialAgreement, 'schedule_summary' | 'installments'> | null | undefined,
): number | null {
  const fromSummary = readNumber(agreement?.schedule_summary?.installment_count);
  if (fromSummary != null) return fromSummary;
  const operational = filterOperationalInstallments(agreement?.installments);
  return operational.length > 0 ? operational.length : null;
}

function amountsEqual(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.01;
}

/**
 * Historical projection is meaningful when present and not a duplicate of the current schedule.
 * Missing fields (legacy backends) ⇒ no historical section.
 */
export function hasMeaningfulHistoricalSchedule(
  agreement: Pick<
    FinancialAgreement,
    'historical_schedule_summary' | 'historical_installments' | 'schedule_summary' | 'installments'
  > | null | undefined,
): boolean {
  const historical = agreement?.historical_installments;
  const historicalSummary = agreement?.historical_schedule_summary;
  const hasHistoricalRows = Array.isArray(historical) && historical.length > 0;
  const historicalCount = readNumber(historicalSummary?.installment_count);
  const historicalTotal = readNumber(historicalSummary?.total_amount);
  const hasHistoricalSummary = historicalCount != null || historicalTotal != null;

  if (!hasHistoricalRows && !hasHistoricalSummary) return false;

  const currentCount = resolveCurrentInstallmentCount(agreement);
  const currentTotal = resolveCurrentScheduleTotal(agreement);
  const sameCount =
    historicalCount != null && currentCount != null && historicalCount === currentCount;
  const sameTotal = amountsEqual(historicalTotal, currentTotal);

  // Exact duplicate of the operational schedule — skip empty-value duplicate UI.
  if (sameCount && sameTotal) return false;

  return true;
}

export function resolveTotalsMismatch(input: {
  finalTotal?: number | null;
  currentScheduleTotal?: number | null;
}): boolean {
  const finalTotal = input.finalTotal;
  const scheduleTotal = input.currentScheduleTotal;
  if (finalTotal == null || scheduleTotal == null) return false;
  return Math.abs(finalTotal - scheduleTotal) > 0.009;
}
