import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import { resolveInstallmentDisplayLabel } from './resolve-installment-display';

export interface StudentFinanceOverviewMetrics {
  currency: string | null;
  annual_total: number | null;
  due_to_date: number | null;
  paid: number | null;
  paid_confirmed: number | null;
  pending_cheque: number | null;
  unconfirmed_coverage: number | null;
  covered_total: number | null;
  remaining: number | null;
  remaining_actual: number | null;
  remaining_after_pending: number | null;
  overdue: number | null;
  upcoming: number | null;
  future_not_due: number | null;
  next_installment_amount: number | null;
  next_installment_date: string | null;
  next_installment_fee_name: string | null;
  next_installment_period: string | null;
  next_installment_display_label: string | null;
  next_installment_state: string | null;
  next_installment_pending_cheque: number | null;
  has_special_agreement: boolean;
  fees_count: number | null;
  installments_count: number | null;
  has_pending_cheque: boolean;
  cheque_pending_total: number | null;
  cheque_pending_allocated: number | null;
  cheque_pending_unallocated: number | null;
}

export function resolveStudentFinanceOverviewMetrics(
  overview: StudentFinancialOverview | null | undefined,
): StudentFinanceOverviewMetrics | null {
  if (!overview?.totals) return null;

  const totals = overview.totals;
  const next = overview.next_installment;
  const agreement = overview.special_agreement;
  const hasSpecialAgreement =
    agreement != null &&
    !agreement.empty_draft &&
    agreement.state != null &&
    !['draft', 'cancelled'].includes(String(agreement.state)) &&
    (agreement.net_amount ?? agreement.total_amount ?? 0) > 0;

  const pendingCheque = totals.pending_cheque ?? 0;
  const chequeSummary = overview.cheque_summary;
  const chequePendingTotal =
    chequeSummary != null && chequeSummary.pending_amount > 0
      ? chequeSummary.pending_amount
      : pendingCheque;
  const chequePendingAllocated = pendingCheque;
  const chequePendingUnallocated = Math.max(0, chequePendingTotal - chequePendingAllocated);
  const remainingAfterPending = totals.remaining;
  const remainingActual =
    pendingCheque > 0 ? remainingAfterPending + pendingCheque : remainingAfterPending;

  return {
    currency: resolveFinanceCurrency(totals.currency?.name ?? totals.currency),
    annual_total: totals.annual_total,
    due_to_date: totals.due_to_date,
    paid: totals.paid,
    paid_confirmed: totals.paid_confirmed,
    pending_cheque: pendingCheque,
    unconfirmed_coverage: chequePendingAllocated,
    covered_total: totals.covered_total,
    remaining: remainingAfterPending,
    remaining_actual: remainingActual,
    remaining_after_pending: remainingAfterPending,
    overdue: totals.overdue,
    upcoming: totals.upcoming,
    future_not_due: totals.upcoming,
    next_installment_amount: next?.remaining_amount ?? null,
    next_installment_date: next?.due_date ?? null,
    next_installment_fee_name: next?.fee_name ?? next?.fee_type_name ?? null,
    next_installment_period: next?.period_label ?? null,
    next_installment_display_label: next ? resolveInstallmentDisplayLabel(next) : null,
    next_installment_state: next?.display_state ?? next?.state ?? next?.payment_status ?? null,
    next_installment_pending_cheque: next?.pending_cheque_amount ?? null,
    has_special_agreement: hasSpecialAgreement,
    fees_count: overview.counts?.fees_count ?? null,
    installments_count: overview.counts?.installments_count ?? null,
    has_pending_cheque: chequePendingTotal > 0 || pendingCheque > 0,
    cheque_pending_total: chequePendingTotal,
    cheque_pending_allocated: chequePendingAllocated,
    cheque_pending_unallocated: chequePendingUnallocated,
  };
}

export function resolveBillingPartyLabel(input: {
  billingProfile?: StudentFinancialOverview['billing_profile'];
  financialResponsibleName?: string | null;
  billingPartyType?: string | null;
  t: (key: string) => string;
}): string {
  if (input.financialResponsibleName?.trim()) {
    return `${input.t('admin.finance.billingPartyGuardian')}: ${input.financialResponsibleName.trim()}`;
  }
  const partyType = input.billingProfile?.billing_party_type ?? input.billingPartyType;
  if (partyType === 'student') return input.t('admin.finance.billingPartyStudentSelf');
  if (partyType === 'guardian') return input.t('admin.finance.billingPartyGuardian');
  if (partyType === 'custom') return input.t('admin.finance.billingPartyCustom');
  return input.t('common.dash');
}
