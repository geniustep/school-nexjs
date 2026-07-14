/**
 * Broadcast so list + dashboard refresh after any admission action that
 * changes application_status / counts (family approval, accept, etc.).
 * Not React Query — Admissions uses useResource; this is the shared invalidation bus.
 */
export const ADMISSIONS_QUERIES_INVALIDATED_EVENT = 'admissions:queries-invalidated';

export type AdmissionsInvalidateDetail = {
  reason?: string;
  admissionId?: number | string;
};

export function notifyAdmissionsQueriesInvalidated(
  detail: AdmissionsInvalidateDetail = {},
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ADMISSIONS_QUERIES_INVALIDATED_EVENT, { detail }),
  );
}
