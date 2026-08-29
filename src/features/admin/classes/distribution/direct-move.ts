import type { DistributionSelectionItem } from '@/types/class-distribution';

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
