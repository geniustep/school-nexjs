import type {
  EnrollmentPlanPreviewResult,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { StudentCreateFinancePayload } from '@/types/student-enrollment-finance';
import {
  getStudentCreateFinanceBlockReason,
  type StudentProfileFormState,
} from './student-profile';
import { validateEnrollmentFinanceSave } from './enrollment-finance-review';

export type StudentCreateFinanceActivationMode = 'draft' | 'activate';

export interface StudentCreateResponseFinance {
  agreement_state?: string | null;
}

export interface StudentCreateResponseData {
  id?: number;
  agreement_state?: string | null;
  finance?: StudentCreateResponseFinance | null;
}

export function resolveStudentCreateAgreementState(
  data: StudentCreateResponseData | null | undefined,
): string | null {
  if (!data) return null;
  return data.agreement_state ?? data.finance?.agreement_state ?? null;
}

export function applyFinanceActivationMode(
  finance: StudentCreateFinancePayload,
  activationMode: StudentCreateFinanceActivationMode,
): StudentCreateFinancePayload {
  if (activationMode !== 'activate') return finance;
  return { ...finance, activation_mode: 'activate' };
}

export function canOfferFinanceAgreementActivation(input: {
  suggest: FeePlanSuggestResult | null;
  financeBlocked: boolean;
  state: StudentProfileFormState;
  schoolId: number | null;
  financeState: StudentCreateFinanceFormState;
  previewLoading: boolean;
  previewError: string | null;
  preview: EnrollmentPlanPreviewResult | null;
}): boolean {
  if (!input.suggest || input.financeBlocked) return false;
  if (getStudentCreateFinanceBlockReason(input.state, input.schoolId) !== 'ok') return false;
  return (
    validateEnrollmentFinanceSave({
      customizePlan: input.financeState.customizePlan,
      customizationReason: input.financeState.customizationReason,
      previewLoading: input.previewLoading,
      previewError: input.previewError,
      preview: input.preview,
      academicYearId: input.state.academicYearId,
      hasFinanceBlock: true,
      suggest: input.suggest,
      financeState: input.financeState,
    }) === 'ok'
  );
}
