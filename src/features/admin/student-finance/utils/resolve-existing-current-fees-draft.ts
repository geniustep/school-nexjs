import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import { normalizeReferenceValue } from './reference-labels';

export type CurrentFeesDraftRef = Pick<
  FinancialAgreement,
  'id' | 'state' | 'source' | 'number' | 'name' | 'academic_year_id'
>;

function isCurrentFeesSource(agreement: {
  source?: string | null;
  creation_source?: string | null;
}): boolean {
  const raw = agreement.creation_source ?? agreement.source ?? null;
  return raw != null && normalizeReferenceValue(raw) === 'current_fees';
}

function matchesAcademicYear(
  item: { academic_year_id?: number | null },
  academicYearId?: number | null,
): boolean {
  if (!academicYearId) return true;
  if (item.academic_year_id == null) return true;
  return item.academic_year_id === academicYearId;
}

/** Existing draft built from current fees — not a new agreement to create. */
export function resolveExistingCurrentFeesDraft(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  workspaceAgreement?: FinancialAgreement | null;
  academicYearId?: number | null;
}): CurrentFeesDraftRef | null {
  const academicYearId = input.academicYearId ?? null;

  const workspaceAgreement = input.workspaceAgreement;
  if (
    workspaceAgreement?.state === 'draft' &&
    isCurrentFeesSource(workspaceAgreement) &&
    matchesAcademicYear(workspaceAgreement, academicYearId)
  ) {
    return workspaceAgreement;
  }

  const fromSummary =
    input.workspace?.agreements_summary
      ?.filter(
        (item) =>
          item.state === 'draft' &&
          isCurrentFeesSource(item) &&
          matchesAcademicYear(item, academicYearId),
      )
      .sort((a, b) => b.id - a.id)[0] ?? null;

  if (fromSummary) return fromSummary;

  const special = input.financialOverview?.special_agreement;
  if (
    special?.state === 'draft' &&
    isCurrentFeesSource(special) &&
    matchesAcademicYear({ academic_year_id: input.financialOverview?.academic_year?.id }, academicYearId)
  ) {
    return {
      id: special.id,
      state: special.state,
      source: special.source ?? 'current_fees',
      name: special.name ?? undefined,
    };
  }

  return null;
}

export function isOrphanCurrentFeesDraft(input: {
  draft: CurrentFeesDraftRef | null;
  displayedAgreement?: FinancialAgreement | null;
}): boolean {
  if (!input.draft) return false;
  if (!input.displayedAgreement?.id) return true;
  return input.displayedAgreement.id !== input.draft.id;
}
