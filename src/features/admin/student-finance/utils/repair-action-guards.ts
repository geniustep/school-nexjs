import type { FinanceRepairAction } from '../types/finance-repair';

/**
 * Whether a repair action may surface an "execute/apply" affordance.
 *
 * An action is executable only when the admin has permission to apply actions
 * AND the action itself is not blocked. Blocked actions (or read-only admins)
 * must never render an execute button.
 */
export function canExecuteRepairAction(
  action: Pick<FinanceRepairAction, 'isBlocked'>,
  canApplyActions: boolean,
): boolean {
  return canApplyActions && !action.isBlocked;
}

export interface RepairApplyGuardInput {
  requiresReason: boolean;
  requiresConfirmation: boolean;
  reason: string;
  confirmed: boolean;
}

export interface RepairApplyGuardResult {
  ok: boolean;
  /** i18n key for the validation error, or null when the apply may proceed. */
  errorKey: string | null;
}

/**
 * Guard applied right before running a repair action. Enforces that a reason is
 * provided when required and that the confirmation checkbox is ticked when
 * required — preventing a direct apply without the mandatory inputs.
 */
export function validateRepairApply(input: RepairApplyGuardInput): RepairApplyGuardResult {
  if (input.requiresReason && !input.reason.trim()) {
    return {
      ok: false,
      errorKey: 'admin.student360.financeWorkspace.repairCenter.reasonRequired',
    };
  }
  if (input.requiresConfirmation && !input.confirmed) {
    return {
      ok: false,
      errorKey: 'admin.student360.financeWorkspace.repairCenter.confirmRequired',
    };
  }
  return { ok: true, errorKey: null };
}
