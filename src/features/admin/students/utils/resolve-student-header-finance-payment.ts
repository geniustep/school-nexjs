import type { StudentFinanceOverviewSummary } from '@/types/student-finance';
import type { StudentOverviewFinanceSummary } from '@/types/student-overview';

export type StudentHeaderFinancePaymentTone =
  | 'healthy'
  | 'due'
  | 'overdue'
  | 'attention'
  | 'inactive';

export interface StudentHeaderFinancePaymentPresentation {
  visible: boolean;
  enabled: boolean;
  tone: StudentHeaderFinancePaymentTone;
  overdueAmount: number;
  outstandingAmount: number;
}

export interface StudentHeaderFinancePaymentMetricsHint {
  overdue?: number | null;
  outstanding?: number | null;
}

function readFiniteAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function maxAmount(...values: Array<number | null | undefined>): number {
  const candidates = values.filter((value): value is number => value != null);
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

function readFinanceAmounts(
  overviewFinance?: StudentOverviewFinanceSummary | null,
  detailsFinance?: StudentFinanceOverviewSummary | null,
  metricsHint?: StudentHeaderFinancePaymentMetricsHint | null,
): { overdue: number; outstanding: number; statusLabel: string | null } {
  const overviewAvailable = overviewFinance?.available === true;
  const overviewOverdue = overviewAvailable
    ? readFiniteAmount(overviewFinance?.total_overdue)
    : null;
  const overviewOutstanding = overviewAvailable
    ? readFiniteAmount(overviewFinance?.total_outstanding)
    : null;
  const detailsOverdue = readFiniteAmount(detailsFinance?.total_overdue);
  const detailsOutstanding = readFiniteAmount(detailsFinance?.total_outstanding);
  const metricsOverdue = readFiniteAmount(metricsHint?.overdue);
  const metricsOutstanding = readFiniteAmount(metricsHint?.outstanding);

  // Prefer the strongest signal across sources so a stale/zero overview summary
  // cannot hide overdue amounts already known from details or financial overview.
  const overdue = maxAmount(overviewOverdue, detailsOverdue, metricsOverdue);
  const outstanding = maxAmount(
    overviewOutstanding,
    detailsOutstanding,
    metricsOutstanding,
  );

  const statusLabel =
    overviewAvailable ? overviewFinance?.status_label?.trim() ?? null : null;

  return { overdue, outstanding, statusLabel };
}

function statusLabelNeedsAttention(statusLabel: string | null): boolean {
  if (!statusLabel) return false;
  const normalized = statusLabel.toLowerCase();
  return (
    normalized.includes('مراج') ||
    normalized.includes('review') ||
    normalized.includes('مسود') ||
    normalized.includes('draft') ||
    normalized.includes('معطل') ||
    normalized.includes('inactive') ||
    normalized.includes('blocked') ||
    normalized.includes('توقف')
  );
}

function statusLabelSignalsOverdue(statusLabel: string | null): boolean {
  if (!statusLabel) return false;
  const normalized = statusLabel.toLowerCase();
  return (
    normalized.includes('متأخر') ||
    normalized.includes('overdue') ||
    normalized.includes('arrear')
  );
}

export function resolveStudentHeaderFinancePaymentPresentation(input: {
  showFinance: boolean;
  canCollect: boolean;
  overviewFinance?: StudentOverviewFinanceSummary | null;
  detailsFinance?: StudentFinanceOverviewSummary | null;
  /** Authoritative totals from financial overview (same source as finance strip). */
  metricsHint?: StudentHeaderFinancePaymentMetricsHint | null;
  /** True while financial overview is still loading — avoid a false "healthy" green. */
  metricsPending?: boolean;
}): StudentHeaderFinancePaymentPresentation {
  const {
    showFinance,
    canCollect,
    overviewFinance,
    detailsFinance,
    metricsHint,
    metricsPending = false,
  } = input;
  const { overdue, outstanding, statusLabel } = readFinanceAmounts(
    overviewFinance,
    detailsFinance,
    metricsHint,
  );

  if (!showFinance || !canCollect) {
    return {
      visible: false,
      enabled: false,
      tone: 'inactive',
      overdueAmount: overdue,
      outstandingAmount: outstanding,
    };
  }

  let tone: StudentHeaderFinancePaymentTone = 'healthy';
  if (overdue > 0 || statusLabelSignalsOverdue(statusLabel)) {
    tone = 'overdue';
  } else if (statusLabelNeedsAttention(statusLabel)) {
    tone = 'attention';
  } else if (outstanding > 0) {
    tone = 'due';
  } else if (metricsPending) {
    // Unknown balance while overview loads — blue action, never false-green.
    tone = 'due';
  }

  return {
    visible: true,
    enabled: true,
    tone,
    overdueAmount: overdue,
    outstandingAmount: outstanding,
  };
}
