import type { FinanceInstallmentListSummary } from '@/types/finance';
import type { StudentFinanceSummary } from '../types';

export function mapInstallmentsSummaryToStudentFinanceSummary(
  installmentsSummary: FinanceInstallmentListSummary | null | undefined,
  workspaceSummary: StudentFinanceSummary | null | undefined,
): StudentFinanceSummary | null {
  if (!installmentsSummary) return workspaceSummary ?? null;

  return {
    total_agreed: installmentsSummary.total_amount,
    total_due: installmentsSummary.total_amount,
    confirmed_paid: installmentsSummary.total_paid,
    remaining: installmentsSummary.total_remaining,
    overdue: installmentsSummary.total_overdue,
    overdue_installments_count: workspaceSummary?.overdue_installments_count,
    currency: workspaceSummary?.currency ?? null,
  };
}

export function hasOfficialStudentFinanceSummary(
  summary: StudentFinanceSummary | null | undefined,
): boolean {
  if (!summary) return false;
  return [
    summary.total_due,
    summary.confirmed_paid,
    summary.remaining,
    summary.overdue,
    summary.total_agreed,
  ].some((value) => value != null && value > 0);
}
