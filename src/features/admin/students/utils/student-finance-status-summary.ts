import type { StudentFinanceOverviewSummary } from '@/types/student-finance';

export type FinanceStatusTone = 'ok' | 'warn' | 'bad' | 'neutral';

export function resolveFinanceOverviewStatus(
  financeSummary: StudentFinanceOverviewSummary | null | undefined,
  t: (key: string) => string,
): {
  status: string;
  tone: FinanceStatusTone;
  actionTab: 'finance' | 'financial-agreement';
} {
  if (!financeSummary) {
    return {
      status: t('admin.student360.statusSummary.financeUnavailable'),
      tone: 'neutral',
      actionTab: 'finance',
    };
  }

  const assessed = financeSummary.total_assessed ?? 0;
  const outstanding = financeSummary.total_outstanding ?? 0;
  const overdue = financeSummary.total_overdue ?? 0;
  const paid = financeSummary.total_paid ?? 0;
  const allZero = assessed === 0 && outstanding === 0 && overdue === 0 && paid === 0;

  if (allZero && !financeSummary.next_due_date) {
    return {
      status: t('admin.student360.statusSummary.noAgreement'),
      tone: 'warn',
      actionTab: 'financial-agreement',
    };
  }

  if (overdue > 0) {
    return {
      status: t('admin.student360.statusSummary.hasOverdue'),
      tone: 'bad',
      actionTab: 'finance',
    };
  }

  if (outstanding > 0) {
    return {
      status: t('admin.student360.statusSummary.hasBalance'),
      tone: 'warn',
      actionTab: 'finance',
    };
  }

  return {
    status: t('admin.student360.statusSummary.financeClear'),
    tone: 'ok',
    actionTab: 'finance',
  };
}
