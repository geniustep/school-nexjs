import { resolveStudentFinanceOverviewMetrics } from '@/features/admin/student-finance/utils/resolve-student-finance-overview';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentOverviewFinanceSummary } from '@/types/student-overview';

export type OverviewFinanceStripTone = 'empty' | 'healthy' | 'progress' | 'overdue' | 'complete';

export type OverviewFinanceStripStageId =
  | 'obligation'
  | 'paying'
  | 'current'
  | 'overdue'
  | 'complete';

export interface OverviewFinanceStripPresentation {
  available: boolean;
  currency: string | null;
  total: number;
  paid: number;
  remaining: number;
  overdue: number;
  paidPercent: number;
  tone: OverviewFinanceStripTone;
  activeStage: OverviewFinanceStripStageId;
  stages: OverviewFinanceStripStageId[];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveTone(input: {
  total: number;
  paid: number;
  remaining: number;
  overdue: number;
}): OverviewFinanceStripTone {
  if (input.total <= 0 && input.paid <= 0 && input.remaining <= 0) return 'empty';
  if (input.overdue > 0) return 'overdue';
  if (input.remaining <= 0 && input.paid > 0) return 'complete';
  if (input.paid > 0) return 'progress';
  return 'healthy';
}

function resolveActiveStage(tone: OverviewFinanceStripTone, paid: number): OverviewFinanceStripStageId {
  if (tone === 'complete') return 'complete';
  if (tone === 'overdue') return 'overdue';
  if (tone === 'progress' || paid > 0) return 'paying';
  if (tone === 'healthy') return 'current';
  return 'obligation';
}

export function resolveOverviewFinanceStripPresentation(input: {
  financialOverview?: StudentFinancialOverview | null;
  overviewFinance?: StudentOverviewFinanceSummary | null;
}): OverviewFinanceStripPresentation | null {
  const metrics = resolveStudentFinanceOverviewMetrics(input.financialOverview);
  const summary = input.overviewFinance;

  let total = 0;
  let paid = 0;
  let remaining = 0;
  let overdue = 0;
  let currency: string | null = null;
  let available = false;

  if (metrics) {
    available = true;
    currency = metrics.currency;
    total = Number(metrics.annual_total ?? 0);
    paid = Number(metrics.paid_confirmed ?? metrics.paid ?? 0);
    remaining = Number(metrics.remaining ?? 0);
    overdue = Number(metrics.overdue ?? 0);
  } else if (summary?.available !== false && summary != null) {
    const hasAny =
      summary.total_outstanding != null ||
      summary.total_paid != null ||
      summary.total_overdue != null;
    if (!hasAny) return null;
    available = true;
    currency =
      typeof summary.currency === 'string'
        ? summary.currency
        : summary.currency?.name ?? null;
    remaining = Number(summary.total_outstanding ?? 0);
    paid = Number(summary.total_paid ?? 0);
    overdue = Number(summary.total_overdue ?? 0);
    total = paid + remaining;
  } else {
    return null;
  }

  const paidPercent = total > 0 ? clampPercent((paid / total) * 100) : paid > 0 ? 100 : 0;
  const tone = resolveTone({ total, paid, remaining, overdue });
  const activeStage = resolveActiveStage(tone, paid);

  return {
    available,
    currency,
    total,
    paid,
    remaining,
    overdue,
    paidPercent,
    tone,
    activeStage,
    stages: ['obligation', 'paying', 'current', 'overdue', 'complete'],
  };
}
