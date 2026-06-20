import type { AllowedActionsMap } from '../types';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import { canAssignStudentFees } from '@/features/admin/students/utils/resolve-capabilities';
import type { StudentCapabilities } from '@/types/student-360';

function actionAllowed(actions: AllowedActionsMap | undefined, keys: string[]): boolean {
  if (!actions) return false;
  return keys.some((key) => actions[key] === true);
}

export function resolveChangePlanVisibility(input: {
  agreementState?: string | null;
  allowedActions?: AllowedActionsMap;
  studentCapabilities: StudentCapabilities;
  financeCapabilities?: StudentFinanceCapabilities | null;
}): { showReplaceIfUnpaid: boolean; showSocialDiscount: boolean } {
  const active = input.agreementState === 'active';
  if (!active) {
    return { showReplaceIfUnpaid: false, showSocialDiscount: false };
  }

  const actions = input.allowedActions;
  const canAssign = canAssignStudentFees(input.studentCapabilities, input.financeCapabilities ?? null);
  const canManageDiscounts = input.financeCapabilities?.can_manage_discounts === true;

  const showReplaceIfUnpaid =
    actionAllowed(actions, ['replace_if_unpaid', 'change_plan', 'change_fee_plan']) || canAssign;

  const showSocialDiscount =
    actionAllowed(actions, ['social_discount_on_future_installments', 'social_discount', 'change_plan']) ||
    canManageDiscounts ||
    canAssign;

  return { showReplaceIfUnpaid, showSocialDiscount };
}
