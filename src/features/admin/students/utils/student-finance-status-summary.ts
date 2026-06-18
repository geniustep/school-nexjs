import type { StudentFinanceOverviewMetrics } from '@/features/admin/student-finance/utils/resolve-student-finance-overview';
import type { StudentFinanceOverviewSummary } from '@/types/student-finance';
import type { SpecialAgreementSummary } from '@/types/student-financial-overview';

export type FinanceStatusTone = 'ok' | 'warn' | 'bad' | 'neutral';

const INACTIVE_AGREEMENT_STATES = new Set(['cancelled', 'terminated', 'completed']);

export function resolveFinanceOverviewStatus(
  financeSummary: StudentFinanceOverviewSummary | null | undefined,
  t: (key: string) => string,
  metrics?: StudentFinanceOverviewMetrics | null,
): {
  status: string;
  tone: FinanceStatusTone;
  actionTab: 'finance';
} {
  if (!financeSummary && !metrics) {
    return {
      status: t('admin.student360.statusSummary.financeUnavailable'),
      tone: 'neutral',
      actionTab: 'finance',
    };
  }

  const assessed = financeSummary?.total_assessed ?? metrics?.annual_total ?? 0;
  const outstanding =
    metrics?.remaining_actual ?? metrics?.remaining ?? financeSummary?.total_outstanding ?? 0;
  const overdue = metrics?.overdue ?? financeSummary?.total_overdue ?? 0;
  const paid = financeSummary?.total_paid ?? metrics?.paid ?? 0;
  const hasPendingCheque = metrics?.has_pending_cheque ?? false;
  const pendingChequeTotal = metrics?.cheque_pending_total ?? metrics?.pending_cheque ?? 0;
  const allZero = assessed === 0 && outstanding === 0 && overdue === 0 && paid === 0;

  if (allZero && !financeSummary?.next_due_date && !metrics?.next_installment_date) {
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

  if (
    hasPendingCheque &&
    (outstanding > 0 || pendingChequeTotal > 0 || (financeSummary?.total_outstanding ?? 0) > 0)
  ) {
    return {
      status: t('admin.student360.statusSummary.financePendingCheque'),
      tone: 'warn',
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

function resolveAgreementState(
  agreement: SpecialAgreementSummary | string | null | undefined,
): string | null {
  if (!agreement) return null;
  if (typeof agreement === 'string') return agreement;
  if (agreement.empty_draft && (agreement.net_amount ?? agreement.total_amount ?? 0) <= 0) {
    return null;
  }
  return agreement.state ?? null;
}

export function resolveSpecialAgreementOverviewStatus(
  agreement: SpecialAgreementSummary | string | null | undefined,
  t: (key: string) => string,
): { status: string; tone: FinanceStatusTone } {
  const agreementState = resolveAgreementState(agreement);

  if (!agreementState) {
    return {
      status: t('admin.student360.statusSummary.noSpecialAgreement'),
      tone: 'neutral',
    };
  }

  if (INACTIVE_AGREEMENT_STATES.has(agreementState)) {
    return {
      status: t('admin.student360.statusSummary.noActiveFinancialAgreement'),
      tone: 'warn',
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
