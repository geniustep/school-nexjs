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
      status: t('admin.student360.statusSummary.noFinanceFees'),
      tone: 'neutral',
      actionTab: 'finance',
    };
  }

  if (overdue > 0) {
    return {
      status: t('admin.student360.statusSummary.financeHasOverdue'),
      tone: 'bad',
      actionTab: 'finance',
    };
  }

  if (outstanding > 0) {
    return {
      status: t('admin.student360.statusSummary.financeHasBalance'),
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

export function resolveSpecialAgreementOverviewStatus(
  agreementState: string | null | undefined,
  t: (key: string) => string,
): { status: string; tone: FinanceStatusTone } {
  if (!agreementState || agreementState === 'cancelled') {
    return {
      status: t('admin.student360.statusSummary.noSpecialAgreement'),
      tone: 'neutral',
    };
  }
  if (agreementState === 'draft') {
    return {
      status: t('admin.student360.statusSummary.specialAgreementDraft'),
      tone: 'warn',
    };
  }
  if (agreementState === 'approved' || agreementState === 'active' || agreementState === 'amended') {
    return {
      status: t('admin.student360.statusSummary.specialAgreementApproved'),
      tone: 'ok',
    };
  }
  return {
    status: t('admin.student360.statusSummary.specialAgreementPending'),
    tone: 'warn',
  };
}
