import type { StudentFinanceWorkspace } from '../types';

export type ResetFinancialAgreementMode = 'rebuild_from_current_fee_plan';

export interface ResetFinancialAgreementPayload {
  reason: string;
  mode: ResetFinancialAgreementMode;
  academic_year_id?: number;
}

export function readAcademicYearId(workspace?: StudentFinanceWorkspace | null): number | undefined {
  const id = workspace?.academic_year?.id;
  return typeof id === 'number' && Number.isFinite(id) && id > 0 ? id : undefined;
}

export function canSubmitResetFinancialAgreement(reason: string): boolean {
  return reason.trim().length > 0;
}

export function buildResetFinancialAgreementPayload(
  reason: string,
  workspace?: StudentFinanceWorkspace | null,
): ResetFinancialAgreementPayload {
  const payload: ResetFinancialAgreementPayload = {
    reason: reason.trim(),
    mode: 'rebuild_from_current_fee_plan',
  };
  const academicYearId = readAcademicYearId(workspace);
  if (academicYearId != null) {
    payload.academic_year_id = academicYearId;
  }
  return payload;
}
