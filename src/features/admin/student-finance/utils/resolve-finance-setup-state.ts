import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, InactiveAgreementSummary, StudentFinanceWorkspace } from '../types';
import { normalizeReferenceValue } from './reference-labels';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';
import {
  resolvePreActiveFinancialAgreement,
  type PreActiveFinancialAgreementRef,
} from './resolve-pre-active-financial-agreement';
import { buildStudentFinanceWorkspaceHref } from './student-finance-sub-tab';

export type FinanceSetupStateKind =
  | 'active_agreement'
  | 'pre_active_agreement'
  | 'assigned_fees_without_active_agreement'
  | 'cancelled_or_inactive_agreement_with_fees'
  | 'clean_no_finance'
  | 'unknown_or_api_gap';

export type FinanceSetupState = {
  kind: FinanceSetupStateKind;
  preActiveAgreement: PreActiveFinancialAgreementRef | null;
  inactiveAgreement: { id: number; state: string; number?: string | null } | null;
  hasExistingFees: boolean;
  hasPriorAgreements: boolean;
  canSafelyAssignPlan: boolean;
};

const INACTIVE_AGREEMENT_STATES = new Set([
  'cancelled',
  'inactive',
  'terminated',
  'expired',
  'superseded',
]);

export function isInactiveAgreementState(state: string | null | undefined): boolean {
  if (!state) return false;
  return INACTIVE_AGREEMENT_STATES.has(normalizeReferenceValue(state));
}

function hasAssignedFeesOrInstallments(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): boolean {
  const totals = input.financialOverview?.totals;
  if (
    (totals?.paid ?? 0) > 0 ||
    (totals?.paid_confirmed ?? 0) > 0 ||
    (totals?.annual_total ?? 0) > 0 ||
    (totals?.due_to_date ?? 0) > 0 ||
    (totals?.remaining ?? 0) > 0 ||
    (totals?.overdue ?? 0) > 0 ||
    (totals?.upcoming ?? 0) > 0
  ) {
    return true;
  }

  const counts = input.financialOverview?.counts;
  if ((counts?.fees_count ?? 0) > 0 || (counts?.installments_count ?? 0) > 0) return true;
  if (input.financialOverview?.next_installment != null) return true;
  if ((input.financialOverview?.applied_plans?.length ?? 0) > 0) return true;
  if ((input.workspace?.recent_collections?.length ?? 0) > 0) return true;

  const instSummary = input.workspace?.installments_summary;
  return (instSummary?.upcoming_count ?? 0) > 0 || (instSummary?.overdue_count ?? 0) > 0;
}

function resolveInactiveAgreementRef(input: {
  workspace?: StudentFinanceWorkspace | null;
  agreementsList?: FinancialAgreement[] | null;
  inactiveAgreement?: InactiveAgreementSummary | null;
  academicYearId?: number | null;
}): { id: number; state: string; number?: string | null } | null {
  const workspaceInactive = input.inactiveAgreement ?? input.workspace?.inactive_agreement ?? null;
  if (workspaceInactive?.id != null && isInactiveAgreementState(workspaceInactive.state)) {
    return {
      id: workspaceInactive.id,
      state: workspaceInactive.state ?? 'cancelled',
      number: null,
    };
  }

  const yearId = input.academicYearId ?? null;
  for (const row of input.agreementsList ?? []) {
    if (row.id == null || !isInactiveAgreementState(row.state)) continue;
    const rowYearId = row.academic_year_id ?? row.academic_year?.id ?? null;
    if (yearId != null && rowYearId != null && rowYearId !== yearId) continue;
    return {
      id: row.id,
      state: row.state ?? 'cancelled',
      number: row.number ?? row.name ?? null,
    };
  }

  const workspaceAgreement = input.workspace?.current_agreement ?? null;
  if (workspaceAgreement?.id != null && isInactiveAgreementState(workspaceAgreement.state)) {
    return {
      id: workspaceAgreement.id,
      state: workspaceAgreement.state ?? 'cancelled',
      number: workspaceAgreement.number ?? workspaceAgreement.name ?? null,
    };
  }

  return null;
}

function hasPriorAgreements(input: {
  agreementsList?: FinancialAgreement[] | null;
  inactiveAgreement: { id: number } | null;
}): boolean {
  if (input.inactiveAgreement != null) return true;
  return (input.agreementsList?.length ?? 0) > 0;
}

export function canSafelyAssignFinancePlan(kind: FinanceSetupStateKind): boolean {
  return kind === 'clean_no_finance';
}

export function shouldBlockAssignPlanForSetupState(kind: FinanceSetupStateKind): boolean {
  return !canSafelyAssignFinancePlan(kind);
}

export function buildStudentFinanceScheduleHref(studentId: number): string {
  return buildStudentFinanceWorkspaceHref(studentId, 'schedule');
}

export function buildStudentFinanceOverviewHref(studentId: number): string {
  return buildStudentFinanceWorkspaceHref(studentId, 'overview');
}

export function resolveFinanceSetupState(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  agreementsList?: FinancialAgreement[] | null;
  inactiveAgreement?: InactiveAgreementSummary | null;
  academicYearId?: number | null;
  financialOverviewLoaded?: boolean;
  agreementsListLoaded?: boolean;
  workspaceLoaded?: boolean;
}): FinanceSetupState {
  const preActiveAgreement = resolvePreActiveFinancialAgreement({
    specialAgreement: input.financialOverview?.special_agreement ?? null,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    inactiveAgreement: input.inactiveAgreement ?? input.workspace?.inactive_agreement ?? null,
    agreementsList: input.agreementsList,
    academicYearId: input.academicYearId,
  });

  const inactiveAgreement = resolveInactiveAgreementRef({
    workspace: input.workspace,
    agreementsList: input.agreementsList,
    inactiveAgreement: input.inactiveAgreement ?? input.workspace?.inactive_agreement ?? null,
    academicYearId: input.academicYearId,
  });

  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview,
  });

  const hasExistingFees = hasAssignedFeesOrInstallments({
    workspace: input.workspace,
    financialOverview: input.financialOverview,
  });

  const hasPriorAgreementsFlag = hasPriorAgreements({
    agreementsList: input.agreementsList,
    inactiveAgreement,
  });

  const overviewLoaded = input.financialOverviewLoaded !== false;
  const agreementsLoaded = input.agreementsListLoaded !== false;
  const workspaceLoaded = input.workspaceLoaded !== false;
  const hasAnySignal =
    input.financialOverview != null ||
    input.workspace != null ||
    input.agreementsList != null;

  if (!hasAnySignal && overviewLoaded && agreementsLoaded && workspaceLoaded) {
    return {
      kind: 'unknown_or_api_gap',
      preActiveAgreement: null,
      inactiveAgreement: null,
      hasExistingFees: false,
      hasPriorAgreements: false,
      canSafelyAssignPlan: false,
    };
  }

  if (hasActiveAgreement) {
    return {
      kind: 'active_agreement',
      preActiveAgreement: null,
      inactiveAgreement,
      hasExistingFees,
      hasPriorAgreements: hasPriorAgreementsFlag,
      canSafelyAssignPlan: false,
    };
  }

  if (preActiveAgreement) {
    return {
      kind: 'pre_active_agreement',
      preActiveAgreement,
      inactiveAgreement,
      hasExistingFees,
      hasPriorAgreements: hasPriorAgreementsFlag,
      canSafelyAssignPlan: false,
    };
  }

  if (inactiveAgreement && hasExistingFees) {
    return {
      kind: 'cancelled_or_inactive_agreement_with_fees',
      preActiveAgreement: null,
      inactiveAgreement,
      hasExistingFees: true,
      hasPriorAgreements: true,
      canSafelyAssignPlan: false,
    };
  }

  if (hasExistingFees) {
    return {
      kind: 'assigned_fees_without_active_agreement',
      preActiveAgreement: null,
      inactiveAgreement,
      hasExistingFees: true,
      hasPriorAgreements: hasPriorAgreementsFlag,
      canSafelyAssignPlan: false,
    };
  }

  if (inactiveAgreement) {
    return {
      kind: 'cancelled_or_inactive_agreement_with_fees',
      preActiveAgreement: null,
      inactiveAgreement,
      hasExistingFees: false,
      hasPriorAgreements: true,
      canSafelyAssignPlan: false,
    };
  }

  if (!overviewLoaded || (!agreementsLoaded && !workspaceLoaded)) {
    return {
      kind: 'unknown_or_api_gap',
      preActiveAgreement: null,
      inactiveAgreement: null,
      hasExistingFees: false,
      hasPriorAgreements: hasPriorAgreementsFlag,
      canSafelyAssignPlan: false,
    };
  }

  return {
    kind: 'clean_no_finance',
    preActiveAgreement: null,
    inactiveAgreement: null,
    hasExistingFees: false,
    hasPriorAgreements: false,
    canSafelyAssignPlan: true,
  };
}

export function resolveAlreadyAssignedErrorKey(
  setupKind: FinanceSetupStateKind | null | undefined,
): string {
  switch (setupKind) {
    case 'pre_active_agreement':
      return 'admin.finance.assignErrors.draftAgreementBlocksAssignPlan';
    case 'assigned_fees_without_active_agreement':
      return 'admin.finance.assignErrors.assignedFeesBlocksAssignPlan';
    case 'cancelled_or_inactive_agreement_with_fees':
      return 'admin.finance.assignErrors.inactiveAgreementFeesBlocksAssignPlan';
    default:
      return 'admin.finance.assignErrors.feesAlreadyAssignedFallback';
  }
}
