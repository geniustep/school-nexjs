import type { StudentFinanceCapabilities } from '@/types/student-finance';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import { hasFinanceSummaryMetrics } from './normalize-student-finance-workspace';
import { resolveSpecialAgreementId } from './resolve-draft-agreement-presentation';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';
import { hasAgreementData, normalizeReferenceValue } from './reference-labels';
import { resolveChangePlanEligibility, type ChangePlanEligibility } from './resolve-change-plan-eligibility';
import {
  resolveInactiveAgreementPresentation,
  type InactiveAgreementPresentation,
} from './resolve-inactive-agreement-presentation';

/** Terminal states only — completed agreements remain billable/manageable in the UI. */
function isTerminalAgreementState(state: string | null | undefined): boolean {
  if (!state) return false;
  const normalized = normalizeReferenceValue(state);
  return normalized === 'cancelled' || normalized === 'terminated';
}

export function resolveFinanceAdminCapabilities(input: {
  studentCapabilities: StudentCapabilities;
  workspaceFinanceCapabilities?: StudentFinanceCapabilities | null;
  overviewFinanceCapabilities?: StudentFinanceCapabilities | null;
}): {
  canAssign: boolean;
  canManageDiscounts: boolean;
  canCollect: boolean;
  hasFinanceAccess: boolean;
} {
  const canAssign =
    input.workspaceFinanceCapabilities?.can_assign_fees === true ||
    input.overviewFinanceCapabilities?.can_assign_fees === true ||
    input.studentCapabilities.can_assign_fees === true;

  const canManageDiscounts =
    input.workspaceFinanceCapabilities?.can_manage_discounts === true ||
    input.overviewFinanceCapabilities?.can_manage_discounts === true ||
    input.studentCapabilities.can_manage_discounts === true;

  const canCollect =
    input.workspaceFinanceCapabilities?.can_collect === true ||
    input.overviewFinanceCapabilities?.can_collect === true ||
    input.studentCapabilities.can_collect_payments === true;

  const canViewFinance = input.studentCapabilities.can_view_finance === true;

  return {
    canAssign,
    canManageDiscounts,
    canCollect,
    hasFinanceAccess: canAssign || canManageDiscounts || canCollect || canViewFinance,
  };
}

/** Agreement exists and is manageable — aligned with agreement tab (not empty/cancelled). */
export function hasManageableFinancialAgreement(input: {
  workspaceAgreement?: FinancialAgreement | null;
  financialOverview?: StudentFinancialOverview | null;
}): boolean {
  const workspaceAgreement = input.workspaceAgreement;
  if (
    hasAgreementData(workspaceAgreement) &&
    workspaceAgreement?.empty_draft !== true &&
    !isTerminalAgreementState(workspaceAgreement?.state)
  ) {
    return true;
  }

  const special = input.financialOverview?.special_agreement;
  const specialId = resolveSpecialAgreementId(special);
  if (
    specialId != null &&
    special?.empty_draft !== true &&
    !isTerminalAgreementState(special?.state)
  ) {
    return true;
  }

  if (
    hasActiveFinancialAgreement({
      workspaceAgreement,
      financialOverview: input.financialOverview,
    })
  ) {
    return true;
  }

  return false;
}

/** Billable finance context — same signals that power agreement / collection UI. */
export function hasFinanceAgreementContext(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): boolean {
  if (
    hasManageableFinancialAgreement({
      workspaceAgreement: input.workspace?.current_agreement ?? null,
      financialOverview: input.financialOverview,
    })
  ) {
    return true;
  }

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
  if ((input.workspace?.agreements_summary?.length ?? 0) > 0) return true;

  const instSummary = input.workspace?.installments_summary;
  if ((instSummary?.upcoming_count ?? 0) > 0 || (instSummary?.overdue_count ?? 0) > 0) {
    return true;
  }

  return false;
}

export function resolveChangePlanVisibility(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  studentCapabilities: StudentCapabilities;
  /** Same gate as «إدارة الاتفاق المالي» in the command bar (subTab !== agreements). */
  showManageAgreementBar?: boolean;
  canCollect?: boolean;
}): {
  showChangePlan: boolean;
  showSpecialAdjustment: boolean;
  showReviewAgreement: boolean;
  reviewAgreementKind: 'fix' | 'review';
  eligibility: ChangePlanEligibility;
  inactiveAgreement: InactiveAgreementPresentation;
} {
  const showManageAgreementBar = input.showManageAgreementBar !== false;

  const eligibility = resolveChangePlanEligibility({
    workspace: input.workspace,
    financialOverview: input.financialOverview,
    studentCapabilities: input.studentCapabilities,
    canCollect: input.canCollect,
  });

  const inactiveAgreement = resolveInactiveAgreementPresentation({
    workspace: input.workspace,
    eligibility,
  });

  if (!showManageAgreementBar || !eligibility.hasFinanceAccess) {
    return {
      showChangePlan: false,
      showSpecialAdjustment: false,
      showReviewAgreement: false,
      reviewAgreementKind: 'review',
      eligibility,
      inactiveAgreement,
    };
  }

  if (!eligibility.hasActiveAgreementInUi) {
    return {
      showChangePlan: false,
      showSpecialAdjustment: false,
      showReviewAgreement: inactiveAgreement.showReviewAction,
      reviewAgreementKind: inactiveAgreement.reviewActionKind,
      eligibility,
      inactiveAgreement,
    };
  }

  return {
    showChangePlan: true,
    showSpecialAdjustment: true,
    showReviewAgreement: false,
    reviewAgreementKind: 'review',
    eligibility,
    inactiveAgreement,
  };
}
