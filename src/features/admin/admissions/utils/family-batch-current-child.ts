import type { FamilyBatchApplicationSummary } from '@/types/admission';

/**
 * Order family batch applications so the route/current admission appears first.
 * Does not mutate the input array.
 */
export function orderFamilyBatchApplicationsForCurrentChild<
  T extends Pick<FamilyBatchApplicationSummary, 'id'>,
>(applications: T[], currentAdmissionId: number): T[] {
  if (!Array.isArray(applications) || applications.length === 0) return [];
  const current = applications.filter((app) => app.id === currentAdmissionId);
  const siblings = applications.filter((app) => app.id !== currentAdmissionId);
  // If current id is missing from the batch, keep original stable order.
  if (current.length === 0) return [...applications];
  return [...current, ...siblings];
}

export function familyBatchSiblingApplications<
  T extends Pick<FamilyBatchApplicationSummary, 'id'>,
>(applications: T[], currentAdmissionId: number): T[] {
  return applications.filter((app) => app.id !== currentAdmissionId);
}
