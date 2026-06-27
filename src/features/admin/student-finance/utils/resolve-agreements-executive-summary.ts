import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import { resolveAgreementFinanceSummary } from './resolve-draft-agreement-presentation';
import { normalizeReferenceValue } from './reference-labels';

export interface AgreementsExecutiveSummaryCounts {
  active: number;
  draft: number;
  historical: number;
  total: number;
}

export interface AgreementsExecutiveSummaryPresentation {
  show: boolean;
  state: string | null;
  totalAmount: number | null;
  paidAmount: number | null;
  remainingAmount: number | null;
  installmentCount: number | null;
  counts: AgreementsExecutiveSummaryCounts;
  currentAgreementId: number | null;
  financeHubHref: string | null;
}

const HISTORICAL_STATES = new Set(['cancelled', 'terminated', 'completed', 'amended']);

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isActiveBilling(workspace?: StudentFinanceWorkspace | null): boolean {
  if (workspace?.billing_context?.has_active_agreement === true) return true;
  return workspace?.current_agreement?.state === 'active';
}

function resolveCounts(
  agreementsSummary: FinancialAgreement[] | undefined,
): AgreementsExecutiveSummaryCounts {
  const counts: AgreementsExecutiveSummaryCounts = { active: 0, draft: 0, historical: 0, total: 0 };
  for (const item of agreementsSummary ?? []) {
    const slug = normalizeReferenceValue(item.state ?? '');
    counts.total += 1;
    if (slug === 'active') counts.active += 1;
    else if (slug === 'draft') counts.draft += 1;
    else if (HISTORICAL_STATES.has(slug)) counts.historical += 1;
  }
  return counts;
}

/** Read-only KPI summary for Student 360 Agreements — never alters current_agreement selection. */
export function resolveAgreementsExecutiveSummary(input: {
  workspace?: StudentFinanceWorkspace | null;
  agreement?: FinancialAgreement | null;
  studentId: number;
}): AgreementsExecutiveSummaryPresentation {
  const { workspace, agreement, studentId } = input;
  const counts = resolveCounts(workspace?.agreements_summary);

  const empty: AgreementsExecutiveSummaryPresentation = {
    show: false,
    state: null,
    totalAmount: null,
    paidAmount: null,
    remainingAmount: null,
    installmentCount: null,
    counts,
    currentAgreementId: null,
    financeHubHref: null,
  };

  if (!agreement?.id) return empty;

  const financeSummary = resolveAgreementFinanceSummary(agreement);
  const activeBilling = isActiveBilling(workspace);

  const totalAmount =
    readNumber(financeSummary?.final_total) ??
    readNumber(financeSummary?.net_total) ??
    readNumber(agreement.net_amount) ??
    readNumber(agreement.total_amount) ??
    readNumber(agreement.gross_amount);

  // Prefer agreement-level figures; fall back to workspace summary only for the active billing agreement.
  const paidAmount =
    readNumber(financeSummary?.paid_amount) ??
    readNumber(agreement.paid_total) ??
    (activeBilling ? readNumber(workspace?.summary?.confirmed_paid) : null);

  const remainingAmount =
    readNumber(financeSummary?.remaining_amount) ??
    readNumber(agreement.remaining_total) ??
    (activeBilling ? readNumber(workspace?.summary?.remaining) : null);

  const installmentCount =
    readNumber(agreement.schedule_summary?.installment_count) ??
    (Array.isArray(agreement.installments) && agreement.installments.length > 0
      ? agreement.installments.length
      : null);

  return {
    show: true,
    state: agreement.state ?? null,
    totalAmount,
    paidAmount,
    remainingAmount,
    installmentCount,
    counts,
    currentAgreementId: agreement.id,
    financeHubHref: `/admin/finance/agreements/${agreement.id}`,
  };
}
