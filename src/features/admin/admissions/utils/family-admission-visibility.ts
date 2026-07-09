import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';

type FamilyAwareAdmission = Pick<
  AdmissionListItem | AdmissionDetail,
  'family_batch_id' | 'family_size'
>;

export function shouldShowFamilyBadge(item: FamilyAwareAdmission): boolean {
  return typeof item.family_size === 'number' && item.family_size > 1;
}

export function hasFamilyBatchLink(item: FamilyAwareAdmission): boolean {
  return typeof item.family_batch_id === 'number' && item.family_batch_id > 0;
}

export function resolveFamilyBadgeCount(item: FamilyAwareAdmission): number {
  if (typeof item.family_size === 'number' && item.family_size > 1) {
    return item.family_size;
  }
  return 0;
}
