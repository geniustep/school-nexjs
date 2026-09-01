import type { FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import { getStudentCreateFinanceBlockReason, type StudentProfileFormState } from './student-profile';

export type StudentCreateFinanceStepGateStatus =
  | 'ok'
  | 'skip'
  | 'select_level'
  | 'loading'
  | 'blocked'
  | 'no_plan'
  | 'prerequisite';

export type StudentCreateFinancePrerequisiteReason = ReturnType<
  typeof getStudentCreateFinanceBlockReason
>;

export interface StudentCreateFinanceStepGate {
  status: StudentCreateFinanceStepGateStatus;
  attachFinance: boolean;
  prerequisiteReason?: StudentCreateFinancePrerequisiteReason;
}

export function resolveStudentCreateFinanceStepGate(input: {
  skipFinance: boolean;
  levelSelected: boolean;
  suggestLoading: boolean;
  financeBlocked: boolean;
  suggest: FeePlanSuggestResult | null;
  prerequisiteReason: StudentCreateFinancePrerequisiteReason;
}): StudentCreateFinanceStepGate {
  if (input.suggest && input.prerequisiteReason !== 'ok') {
    return {
      status: 'prerequisite',
      attachFinance: false,
      prerequisiteReason: input.prerequisiteReason,
    };
  }
  if (!input.levelSelected) return { status: 'select_level', attachFinance: false };
  if (input.suggestLoading) return { status: 'loading', attachFinance: false };
  if (input.financeBlocked) return { status: 'blocked', attachFinance: false };
  if (!input.suggest) return { status: 'no_plan', attachFinance: false };
  return { status: 'ok', attachFinance: true };
}

export function isOptionalFinanceGateStatus(
  _status: StudentCreateFinanceStepGateStatus,
): boolean {
  return false;
}

export function shouldAttachFinanceOnCreate(
  _skipFinance: boolean,
  suggest: FeePlanSuggestResult | null,
  state: StudentProfileFormState,
  schoolId: number | null | undefined,
): boolean {
  if (!suggest) return false;
  return getStudentCreateFinanceBlockReason(state, schoolId) === 'ok';
}
