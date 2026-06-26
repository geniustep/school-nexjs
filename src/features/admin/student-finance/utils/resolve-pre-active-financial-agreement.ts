import type { SpecialAgreementSummary } from '@/types/student-financial-overview';
import type { FinancialAgreement, InactiveAgreementSummary } from '../types';
import { normalizeReferenceValue } from './reference-labels';
import { resolveSpecialAgreementId } from './resolve-draft-agreement-presentation';

export const PRE_ACTIVE_AGREEMENT_STATES = new Set([
  'draft',
  'pending_approval',
  'approved',
]);

export function isPreActiveAgreementState(state: string | null | undefined): boolean {
  if (!state) return false;
  return PRE_ACTIVE_AGREEMENT_STATES.has(normalizeReferenceValue(state));
}

export type PreActiveFinancialAgreementRef = {
  id: number;
  state: string;
  number?: string | null;
};

export function resolvePreActiveFinancialAgreement(input: {
  specialAgreement?: SpecialAgreementSummary | null;
  workspaceAgreement?: FinancialAgreement | null;
  agreementDetail?: FinancialAgreement | null;
  inactiveAgreement?: InactiveAgreementSummary | null;
  agreementsList?: FinancialAgreement[] | null;
  academicYearId?: number | null;
}): PreActiveFinancialAgreementRef | null {
  const detail = input.agreementDetail;
  if (
    detail?.id != null &&
    isPreActiveAgreementState(detail.state) &&
    detail.empty_draft !== true
  ) {
    return {
      id: detail.id,
      state: detail.state ?? 'draft',
      number: detail.number ?? detail.name ?? null,
    };
  }

  const workspaceAgreement = input.workspaceAgreement;
  if (
    workspaceAgreement?.id != null &&
    isPreActiveAgreementState(workspaceAgreement.state) &&
    workspaceAgreement.empty_draft !== true
  ) {
    return {
      id: workspaceAgreement.id,
      state: workspaceAgreement.state ?? 'draft',
      number: workspaceAgreement.number ?? workspaceAgreement.name ?? null,
    };
  }

  const special = input.specialAgreement;
  const specialId = resolveSpecialAgreementId(special);
  if (
    special &&
    specialId != null &&
    special.exists !== false &&
    special.empty_draft !== true &&
    isPreActiveAgreementState(special.state)
  ) {
    return {
      id: specialId,
      state: special.state ?? 'draft',
      number: special.name ?? null,
    };
  }

  const inactive = input.inactiveAgreement;
  if (inactive?.id != null && isPreActiveAgreementState(inactive.state)) {
    return {
      id: inactive.id,
      state: inactive.state ?? 'draft',
      number: null,
    };
  }

  const yearId = input.academicYearId ?? null;
  for (const row of input.agreementsList ?? []) {
    if (row.id == null || !isPreActiveAgreementState(row.state) || row.empty_draft === true) continue;
    const rowYearId = row.academic_year_id ?? row.academic_year?.id ?? null;
    if (yearId != null && rowYearId != null && rowYearId !== yearId) continue;
    return {
      id: row.id,
      state: row.state ?? 'draft',
      number: row.number ?? row.name ?? null,
    };
  }

  return null;
}

export function shouldBlockAssignPlanForPreActiveAgreement(
  preActive: PreActiveFinancialAgreementRef | null | undefined,
): boolean {
  return preActive != null;
}

export function buildStudentFinanceAgreementsHref(studentId: number): string {
  return `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;
}
