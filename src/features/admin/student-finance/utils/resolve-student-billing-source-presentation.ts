import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';

export interface StudentBillingSourcePresentation {
  hasActiveAgreement: boolean;
  agreementNumber: string | null;
  agreementState: string | null;
  originalPlanName: string | null;
}

function readFeePlanNameFromAgreement(agreement: FinancialAgreement | null | undefined): string | null {
  if (!agreement) return null;
  const raw = agreement as FinancialAgreement & {
    fee_plan_name?: string | null;
    original_fee_plan_name?: string | null;
    fee_plan?: { name?: string | null } | null;
  };
  if (typeof raw.fee_plan?.name === 'string' && raw.fee_plan.name.trim()) {
    return raw.fee_plan.name.trim();
  }
  if (typeof raw.fee_plan_name === 'string' && raw.fee_plan_name.trim()) {
    return raw.fee_plan_name.trim();
  }
  if (typeof raw.original_fee_plan_name === 'string' && raw.original_fee_plan_name.trim()) {
    return raw.original_fee_plan_name.trim();
  }
  return null;
}

function isActiveAgreementSummary(
  agreement: StudentFinancialOverview['special_agreement'] | null | undefined,
): boolean {
  if (agreement == null || agreement.empty_draft) return false;
  if (agreement.state !== 'active') return false;
  return (agreement.net_amount ?? agreement.total_amount ?? 0) > 0;
}

export function hasActiveFinancialAgreement(input: {
  financialOverview?: StudentFinancialOverview | null;
  workspaceAgreement?: FinancialAgreement | null;
  workspace?: { billing_context?: { has_active_agreement?: boolean } | null; current_agreement?: FinancialAgreement | null } | null;
}): boolean {
  if (input.workspace?.billing_context?.has_active_agreement === false) {
    return false;
  }
  if (input.workspace?.billing_context?.has_active_agreement === true) {
    return true;
  }
  return (
    input.workspaceAgreement?.state === 'active' ||
    isActiveAgreementSummary(input.financialOverview?.special_agreement)
  );
}

export function resolveStudentBillingSourcePresentation(input: {
  financialOverview?: StudentFinancialOverview | null;
  workspaceAgreement?: FinancialAgreement | null;
  workspace?: StudentFinanceWorkspace | null;
}): StudentBillingSourcePresentation {
  const special = input.financialOverview?.special_agreement;
  const workspaceAgreement = input.workspaceAgreement;
  const hasActiveAgreement = hasActiveFinancialAgreement({
    financialOverview: input.financialOverview,
    workspaceAgreement,
    workspace: input.workspace,
  });

  const inactiveRef = input.workspace?.inactive_agreement;
  const inactiveNumber =
    inactiveRef?.id != null && !hasActiveAgreement ? `#${inactiveRef.id}` : null;

  const agreementNumber = hasActiveAgreement
    ? ((typeof workspaceAgreement?.number === 'string' && workspaceAgreement.number.trim()
        ? workspaceAgreement.number.trim()
        : null) ??
      (typeof workspaceAgreement?.name === 'string' && workspaceAgreement.name.trim()
        ? workspaceAgreement.name.trim()
        : null) ??
      (typeof special?.name === 'string' && special.name.trim() ? special.name.trim() : null) ??
      (special?.id != null
        ? `#${special.id}`
        : workspaceAgreement?.id != null
          ? `#${workspaceAgreement.id}`
          : null))
    : inactiveNumber;

  const agreementState = hasActiveAgreement
    ? (workspaceAgreement?.state ?? special?.state ?? null)
    : null;

  const originalPlanName =
    readFeePlanNameFromAgreement(workspaceAgreement) ??
    input.financialOverview?.applied_plans?.[0]?.name ??
    null;

  return {
    hasActiveAgreement,
    agreementNumber,
    agreementState,
    originalPlanName,
  };
}
