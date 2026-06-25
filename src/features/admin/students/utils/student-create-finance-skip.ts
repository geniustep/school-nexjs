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

/**
 * Decides whether the finance step lets the user proceed and whether a finance
 * payload should be attached when creating the student.
 *
 * When `skipFinance` is chosen the step is always passable and never attaches a
 * finance payload, so a student can be created from an admission without a plan.
 * Otherwise the original (plan-required) behaviour is preserved.
 */
export function resolveStudentCreateFinanceStepGate(input: {
  skipFinance: boolean;
  levelSelected: boolean;
  suggestLoading: boolean;
  financeBlocked: boolean;
  suggest: FeePlanSuggestResult | null;
  prerequisiteReason: StudentCreateFinancePrerequisiteReason;
}): StudentCreateFinanceStepGate {
  if (input.skipFinance) {
    return { status: 'skip', attachFinance: false };
  }
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

/**
 * Whether a finance payload should be attached to the student create request.
 * Skipping (or a missing suggested plan) always omits the finance payload.
 */
export function shouldAttachFinanceOnCreate(
  skipFinance: boolean,
  suggest: FeePlanSuggestResult | null,
  state: StudentProfileFormState,
  schoolId: number | null | undefined,
): boolean {
  if (skipFinance || !suggest) return false;
  return getStudentCreateFinanceBlockReason(state, schoolId) === 'ok';
}
