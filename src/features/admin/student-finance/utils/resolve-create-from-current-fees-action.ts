import type { StudentFinanceWorkspace } from '../types';

/**
 * The legacy "create agreement from current fees" action is only safe to surface
 * when the backend explicitly signals it. The modern path for a student without
 * an agreement is "إعداد الخطة المالية" (assign finance plan), so the legacy
 * action must stay hidden unless one of these explicit signals is present:
 *
 *  - `allowed_actions.create_agreement_from_current_fees === true` (workspace or
 *    current agreement), or
 *  - `agreement_repair.recommended_action === 'create_active_agreement_from_current_fees'`.
 *
 * This avoids showing a button that calls a legacy endpoint which then fails
 * with a 422 for students who should be onboarded via the plan-preview flow.
 */
export function isCreateFromCurrentFeesActionAllowed(input: {
  workspace?: StudentFinanceWorkspace | null;
}): boolean {
  const workspace = input.workspace;
  if (!workspace) return false;

  const workspaceAllowed = workspace.allowed_actions ?? {};
  if (workspaceAllowed.create_agreement_from_current_fees === true) return true;

  const agreementAllowed = workspace.current_agreement?.allowed_actions ?? {};
  if (agreementAllowed.create_agreement_from_current_fees === true) return true;

  if (
    workspace.agreement_repair?.recommended_action ===
    'create_active_agreement_from_current_fees'
  ) {
    return true;
  }

  return false;
}
