import type {
  ClassDistributionMoveRequest,
  DistributionSelectionItem,
} from '@/types/class-distribution';

export function directMoveItems(
  selectedItems: DistributionSelectionItem[],
  draggedItem: DistributionSelectionItem,
): DistributionSelectionItem[] {
  return selectedItems.some((item) => item.studentId === draggedItem.studentId)
    ? selectedItems
    : [draggedItem];
}

export function directTargetSelectValue(value: string): number | null | undefined {
  if (!value) return undefined;
  if (value === 'unassigned') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Promote the exact preview intent to apply without rebuilding moves from UI state.
 * This protects the direct-move flow from accidentally issuing preview twice.
 */
export function applyRequestFromPreview(
  request: ClassDistributionMoveRequest,
): ClassDistributionMoveRequest {
  return {
    ...request,
    mode: 'apply',
    moves: request.moves.map((move) => ({ ...move })),
  };
}
