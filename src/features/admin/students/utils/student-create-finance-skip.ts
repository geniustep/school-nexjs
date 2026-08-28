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
 * Decides whether the finance step lets the user proceed.
 *
 * The mandatory Base Plan is server-owned and fail-closed. Missing or
 * ambiguous/blocked plans must stop registration; only an explicit RBAC skip
 * (for users who cannot operate finance in the wizard) may advance without the
 * client attaching finance. Odoo still resolves the Base Plan from academic
 * context when the student is created.
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

/** Whether the finance gate status may advance without a client finance block. */
export function isOptionalFinanceGateStatus(
  status: StudentCreateFinanceStepGateStatus,
): boolean {
  return status === 'skip';
}

/**
 * Whether finance context is complete enough for the create journey.
 * The full student-create request itself no longer owns fee-plan selection;
 * this helper remains useful for validation and preview readiness.
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
