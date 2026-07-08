import type { CollectionAllocationPriorityLevel } from '@/types/family-finance';

export const COLLECTION_ALLOCATION_PRIORITY_LEVELS: CollectionAllocationPriorityLevel[] = [
  'first',
  'normal',
  'last',
];

export function normalizeCollectionPriorityLevel(
  value: string | null | undefined,
): CollectionAllocationPriorityLevel {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'first' || normalized === 'last') return normalized;
  return 'normal';
}

export function collectionPriorityLabelKey(level: string | null | undefined): string {
  return `admin.finance.services.priority.${normalizeCollectionPriorityLevel(level)}`;
}

export function collectionPriorityBadgeTone(
  level: string | null | undefined,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (normalizeCollectionPriorityLevel(level)) {
    case 'first':
      return 'amber';
    case 'last':
      return 'slate';
    default:
      return 'blue';
  }
}
