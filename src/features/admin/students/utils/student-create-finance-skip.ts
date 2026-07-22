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
 * Fee plans are fully optional: skip / missing / blocked plans never prevent
 * student registration. When a plan is present and not skipped, attach it.
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
  // Missing or blocked plans are optional — registration may continue without finance.
  if (input.financeBlocked) return { status: 'blocked', attachFinance: false };
  if (!input.suggest) return { status: 'no_plan', attachFinance: false };
  return { status: 'ok', attachFinance: true };
}

/** Whether the finance gate status allows advancing without attaching a plan. */
export function isOptionalFinanceGateStatus(
  status: StudentCreateFinanceStepGateStatus,
): boolean {
  return status === 'skip' || status === 'no_plan' || status === 'blocked';
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
