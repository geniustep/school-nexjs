import {
  ADOPT_CORRECT_SCHEDULE_ACTION,
  KEEP_FEE_PLAN_ACTION,
  REMOVE_DUPLICATE_PLAN_ACTION,
  type FinanceRepairActionPayload,
  type FinanceRepairPlanSelectionMode,
} from '../types/finance-repair';

/** Resolve how plan selection maps to the preview/apply body for a given action code. */
export function resolvePlanSelectionMode(actionCode: string): FinanceRepairPlanSelectionMode {
  if (actionCode === KEEP_FEE_PLAN_ACTION) return 'keep';
  if (actionCode === REMOVE_DUPLICATE_PLAN_ACTION) return 'cancel';
  if (actionCode === ADOPT_CORRECT_SCHEDULE_ACTION) return 'adopt';
  return 'none';
}

/** Whether the action requires the admin to pick a single candidate plan before preview. */
export function actionRequiresPlanSelection(mode: FinanceRepairPlanSelectionMode): boolean {
  return mode === 'keep' || mode === 'cancel';
}

/** Whether the action requires picking two plans (official + schedule source). */
export function actionRequiresDualPlanSelection(mode: FinanceRepairPlanSelectionMode): boolean {
  return mode === 'adopt';
}

/** Whether any plan selection (single or dual) is required before preview. */
export function actionRequiresAnyPlanSelection(mode: FinanceRepairPlanSelectionMode): boolean {
  return actionRequiresPlanSelection(mode) || actionRequiresDualPlanSelection(mode);
}

/** Selected plan ids; dual-selection actions use both. */
export interface RepairPlanSelection {
  /** Single-plan actions: the chosen plan. Adopt: the official plan to keep. */
  primaryPlanId: number | null;
  /** Adopt: the plan whose installment schedule is adopted. */
  sourceSchedulePlanId?: number | null;
}

/**
 * Validate the dual selection for the adopt action: both must be chosen and
 * they must be different plans.
 */
export function isAdoptSelectionValid(selection: RepairPlanSelection): boolean {
  const official = selection.primaryPlanId;
  const source = selection.sourceSchedulePlanId ?? null;
  return official != null && source != null && official !== source;
}

/** Build the preview/apply body for the current selection and action code. */
export function buildRepairActionPayload(
  actionCode: string,
  selection: RepairPlanSelection,
): FinanceRepairActionPayload {
  const mode = resolvePlanSelectionMode(actionCode);
  if (mode === 'keep' && selection.primaryPlanId != null) {
    return { keep_plan_id: selection.primaryPlanId };
  }
  if (mode === 'cancel' && selection.primaryPlanId != null) {
    return { target_plan_id: selection.primaryPlanId };
  }
  if (mode === 'adopt' && isAdoptSelectionValid(selection)) {
    return {
      official_plan_id: selection.primaryPlanId as number,
      source_schedule_plan_id: selection.sourceSchedulePlanId as number,
    };
  }
  return {};
}
