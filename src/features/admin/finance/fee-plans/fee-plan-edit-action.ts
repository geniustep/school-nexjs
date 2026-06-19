import {
  feePlanAllowsAction,
  feePlanIsUsed,
  feePlanUsageForDisplay,
} from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';

export type FeePlanEditActionType = 'direct_edit' | 'reset_then_edit' | 'duplicate_for_edit' | 'none';

export interface FeePlanEditAction {
  type: FeePlanEditActionType;
  isUsed: boolean;
  canResetToDraft: boolean;
  canDuplicate: boolean;
}

export function resolveFeePlanEditAction(plan: FeePlan, canManage: boolean): FeePlanEditAction {
  const usage = feePlanUsageForDisplay(plan) ?? undefined;
  const isUsed = feePlanIsUsed(usage);
  const canResetToDraft = feePlanAllowsAction(plan, 'reset_to_draft');
  const canDuplicate = feePlanAllowsAction(plan, 'duplicate');
  const canEdit = feePlanAllowsAction(plan, 'edit');
  const state = feePlanState(plan);

  if (!canManage) {
    return { type: 'none', isUsed, canResetToDraft, canDuplicate };
  }

  if (state === 'draft' && canEdit) {
    return { type: 'direct_edit', isUsed, canResetToDraft, canDuplicate };
  }

  if ((state === 'confirmed' || state === 'active') && isUsed) {
    if (canDuplicate) {
      return { type: 'duplicate_for_edit', isUsed, canResetToDraft, canDuplicate };
    }
    return { type: 'none', isUsed, canResetToDraft, canDuplicate };
  }

  if ((state === 'confirmed' || state === 'active') && !isUsed) {
    if (canResetToDraft) {
      return { type: 'reset_then_edit', isUsed, canResetToDraft, canDuplicate };
    }
    if (canEdit) {
      return { type: 'direct_edit', isUsed, canResetToDraft, canDuplicate };
    }
    return { type: 'none', isUsed, canResetToDraft, canDuplicate };
  }

  if (canEdit) {
    return { type: 'direct_edit', isUsed, canResetToDraft, canDuplicate };
  }

  return { type: 'none', isUsed, canResetToDraft, canDuplicate };
}
