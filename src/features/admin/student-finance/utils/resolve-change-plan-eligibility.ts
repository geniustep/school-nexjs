import type { StudentFinanceCapabilities } from '@/types/student-finance';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';
import { hasFinanceSummaryMetrics } from './normalize-student-finance-workspace';
import { resolveBillingContextPresentation } from './resolve-billing-context-presentation';
import type { StudentFinanceWorkspace } from '../types';

export interface ChangePlanEligibility {
  hasActiveAgreementInUi: boolean;
  hasBillableFinanceContext: boolean;
  hasFinanceAccess: boolean;
  agreementState: string | null;
}

function resolveFinanceAccess(input: {
  studentCapabilities: StudentCapabilities;
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  canCollect?: boolean;
}): boolean {
  const workspaceCaps = input.workspace?.capabilities as StudentFinanceCapabilities | undefined;
  const overviewCaps = input.financialOverview?.capabilities;

  const canAssign =
    workspaceCaps?.can_assign_fees === true ||
    overviewCaps?.can_assign_fees === true ||
    input.studentCapabilities.can_assign_fees === true;

  const canManageDiscounts =
    workspaceCaps?.can_manage_discounts === true ||
    overviewCaps?.can_manage_discounts === true ||
    input.studentCapabilities.can_manage_discounts === true;

  const canCollectPayments =
    workspaceCaps?.can_collect === true ||
    overviewCaps?.can_collect === true ||
    input.studentCapabilities.can_collect_payments === true;

  const canViewFinance = input.studentCapabilities.can_view_finance === true;

  return (
    canAssign ||
    canManageDiscounts ||
    canCollectPayments ||
    canViewFinance ||
    input.canCollect === true
  );
}

function hasBillableFinanceContext(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): boolean {
  if (hasFinanceSummaryMetrics(input.workspace?.summary)) return true;

  const totals = input.financialOverview?.totals;
  if (
    (totals?.paid ?? 0) > 0 ||
    (totals?.paid_confirmed ?? 0) > 0 ||
    (totals?.annual_total ?? 0) > 0 ||
    (totals?.due_to_date ?? 0) > 0 ||
    (totals?.remaining ?? 0) > 0
  ) {
    return true;
  }

  const counts = input.financialOverview?.counts;
  if ((counts?.fees_count ?? 0) > 0 || (counts?.installments_count ?? 0) > 0) return true;
  if ((input.financialOverview?.applied_plans?.length ?? 0) > 0) return true;
  if ((input.workspace?.recent_collections?.length ?? 0) > 0) return true;

  const instSummary = input.workspace?.installments_summary;
  return (instSummary?.upcoming_count ?? 0) > 0 || (instSummary?.overdue_count ?? 0) > 0;
}

export function resolveChangePlanEligibility(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  studentCapabilities: StudentCapabilities;
  canCollect?: boolean;
}): ChangePlanEligibility {
  const workspaceAgreement = input.workspace?.current_agreement ?? null;
  const special = input.financialOverview?.special_agreement;
  const billingContext = resolveBillingContextPresentation({ workspace: input.workspace });

  const hasActiveAgreementInUi =
    billingContext.hasActiveAgreement ||
    hasActiveFinancialAgreement({
      workspaceAgreement,
      financialOverview: input.financialOverview,
    });

  return {
    hasActiveAgreementInUi,
    hasBillableFinanceContext: hasBillableFinanceContext({
      workspace: input.workspace,
      financialOverview: input.financialOverview,
    }),
    hasFinanceAccess: resolveFinanceAccess(input),
    agreementState: hasActiveAgreementInUi
      ? workspaceAgreement?.state ?? special?.state ?? null
      : null,
  };
}
