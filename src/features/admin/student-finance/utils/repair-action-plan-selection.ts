import {
  KEEP_FEE_PLAN_ACTION,
  REMOVE_DUPLICATE_PLAN_ACTION,
  type FinanceRepairActionPayload,
  type FinanceRepairPlanSelectionMode,
} from '../types/finance-repair';

/** Resolve how plan selection maps to the preview/apply body for a given action code. */
export function resolvePlanSelectionMode(actionCode: string): FinanceRepairPlanSelectionMode {
  if (actionCode === KEEP_FEE_PLAN_ACTION) return 'keep';
  if (actionCode === REMOVE_DUPLICATE_PLAN_ACTION) return 'cancel';
  return 'none';
}

/** Whether the action requires the admin to pick a candidate plan before preview. */
export function actionRequiresPlanSelection(mode: FinanceRepairPlanSelectionMode): boolean {
  return mode === 'keep' || mode === 'cancel';
}

/** Build the preview/apply body for a selected plan id. */
export function buildRepairActionPayload(
  actionCode: string,
  selectedPlanId: number | null,
): FinanceRepairActionPayload {
  const mode = resolvePlanSelectionMode(actionCode);
  if (mode === 'keep' && selectedPlanId != null) {
    return { keep_plan_id: selectedPlanId };
  }
  if (mode === 'cancel' && selectedPlanId != null) {
    return { target_plan_id: selectedPlanId };
  }
  return {};
}
