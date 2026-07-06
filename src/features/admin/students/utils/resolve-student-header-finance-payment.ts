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

function readFinanceAmounts(
  overviewFinance?: StudentOverviewFinanceSummary | null,
  detailsFinance?: StudentFinanceOverviewSummary | null,
): { overdue: number; outstanding: number; statusLabel: string | null } {
  const overdue =
    overviewFinance?.available === true
      ? Number(overviewFinance.total_overdue ?? 0)
      : Number(detailsFinance?.total_overdue ?? 0);
  const outstanding =
    overviewFinance?.available === true
      ? Number(overviewFinance.total_outstanding ?? 0)
      : Number(detailsFinance?.total_outstanding ?? 0);
  const statusLabel =
    overviewFinance?.available === true ? overviewFinance.status_label?.trim() ?? null : null;
  return {
    overdue: Number.isFinite(overdue) ? overdue : 0,
    outstanding: Number.isFinite(outstanding) ? outstanding : 0,
    statusLabel,
  };
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

export function resolveStudentHeaderFinancePaymentPresentation(input: {
  showFinance: boolean;
  canCollect: boolean;
  overviewFinance?: StudentOverviewFinanceSummary | null;
  detailsFinance?: StudentFinanceOverviewSummary | null;
}): StudentHeaderFinancePaymentPresentation {
  const { showFinance, canCollect, overviewFinance, detailsFinance } = input;
  const { overdue, outstanding, statusLabel } = readFinanceAmounts(
    overviewFinance,
    detailsFinance,
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
  if (statusLabelNeedsAttention(statusLabel)) {
    tone = 'attention';
  } else if (overdue > 0) {
    tone = 'overdue';
  } else if (outstanding > 0) {
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
