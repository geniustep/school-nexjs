import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { FinanceInstallmentListSummary } from '@/types/finance';
import type { StudentFinanceSummaryData, StudentFinanceSummaryTotals } from '@/types/student-finance';
import type { StudentFinanceWorkspace, StudentInstallment } from '../types';

export interface StudentFinanceOverviewMetrics {
  currency: string | null;
  annual_total: number | null;
  due_to_date: number | null;
  paid: number | null;
  remaining: number | null;
  overdue: number | null;
  next_installment_amount: number | null;
  next_installment_date: string | null;
  has_special_agreement: boolean;
}

function readMoney(value: unknown): number | null {
  const normalized = normalizeMoneyValue(value);
  return normalized == null ? null : normalized;
}

function pickDueToDateFromSummary(totals: StudentFinanceSummaryTotals): number | null {
  const raw = totals as StudentFinanceSummaryTotals & {
    due_to_date?: unknown;
    total_due_to_date?: unknown;
  };
  return readMoney(raw.due_to_date) ?? readMoney(raw.total_due_to_date);
}

function sumCollectibleRemaining(installments: StudentInstallment[] | null | undefined): number | null {
  if (!installments?.length) return null;
  let total = 0;
  let matched = false;
  for (const row of installments) {
    if (row.timing_status !== 'due' && row.timing_status !== 'overdue') continue;
    const remaining = readMoney(row.remaining_amount);
    if (remaining == null) continue;
    total += remaining;
    matched = true;
  }
  return matched ? total : null;
}

function resolveNextInstallment(
  installments: StudentInstallment[] | null | undefined,
  fallbackDate: string | null | undefined,
): { amount: number | null; date: string | null } {
  const candidates = (installments ?? []).filter((row) => (row.remaining_amount ?? 0) > 0);
  const sorted = [...candidates].sort((a, b) => {
    const aDate = a.due_date ?? '';
    const bDate = b.due_date ?? '';
    return aDate.localeCompare(bDate);
  });
  const next = sorted[0];
  if (!next) {
    return { amount: null, date: fallbackDate ?? null };
  }
  return {
    amount: readMoney(next.remaining_amount) ?? readMoney(next.amount),
    date: next.due_date ?? fallbackDate ?? null,
  };
}

export function resolveStudentFinanceOverviewMetrics(input: {
  officialSummary: StudentFinanceSummaryData | null | undefined;
  workspace: StudentFinanceWorkspace | null | undefined;
  installmentsSummary: FinanceInstallmentListSummary | null | undefined;
  collectibleInstallments?: StudentInstallment[] | null | undefined;
}): StudentFinanceOverviewMetrics | null {
  const totals = input.officialSummary?.summary;
  if (!totals) return null;

  const workspaceInstallments = [
    ...(input.workspace?.upcoming_installments ?? []),
    ...(input.workspace?.overdue_installments ?? []),
  ];
  const collectible = input.collectibleInstallments ?? workspaceInstallments;
  const next = resolveNextInstallment(collectible, totals.next_due_date);

  const agreement = input.workspace?.current_agreement;
  const hasSpecialAgreement =
    agreement != null &&
    agreement.state != null &&
    !['draft', 'cancelled'].includes(String(agreement.state)) &&
    (readMoney(agreement.net_amount) ?? 0) > 0;

  return {
    currency: totals.currency?.name ?? input.workspace?.summary?.currency?.name ?? null,
    annual_total: readMoney(totals.total_assessed),
    due_to_date:
      pickDueToDateFromSummary(totals) ??
      sumCollectibleRemaining(collectible) ??
      readMoney(input.installmentsSummary?.total_overdue),
    paid: readMoney(totals.total_paid),
    remaining: readMoney(totals.total_outstanding),
    overdue: readMoney(totals.total_overdue),
    next_installment_amount: next.amount,
    next_installment_date: next.date,
    has_special_agreement: hasSpecialAgreement,
  };
}

export function resolveBillingPartyLabel(input: {
  financialResponsibleName?: string | null;
  billingPartnerName?: string | null;
  billingPartyType?: string | null;
  t: (key: string) => string;
}): string {
  if (input.financialResponsibleName?.trim()) return input.financialResponsibleName.trim();
  if (input.billingPartnerName?.trim()) return input.billingPartnerName.trim();
  if (input.billingPartyType === 'student') return input.t('admin.finance.billingPartyStudentSelf');
  if (input.billingPartyType === 'guardian') return input.t('admin.finance.billingPartyGuardian');
  if (input.billingPartyType === 'custom') return input.t('admin.finance.billingPartyCustom');
  return input.t('common.dash');
}
