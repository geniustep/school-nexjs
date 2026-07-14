/**
 * Kanban helpers: partition/filter by official application_status while Backend
 * ignores per-column application_status list filters.
 */

import type { AdmissionListItem } from '@/types/admission';
import { resolveApplicationStatus } from './admission-modern-status';

/** Keep only rows whose official application_status matches the column id. */
export function filterKanbanItemsByApplicationStatus(
  items: AdmissionListItem[],
  columnStatus: string,
): AdmissionListItem[] {
  return items.filter((item) => resolveApplicationStatus(item) === columnStatus);
}

/**
 * Partition a workspace-scoped fetch into presentation columns.
 * Unknown / null statuses are dropped (not duplicated across columns).
 */
export function partitionKanbanItemsByApplicationStatus(
  items: AdmissionListItem[],
  columns: readonly string[],
): Record<string, AdmissionListItem[]> {
  const out: Record<string, AdmissionListItem[]> = {};
  for (const column of columns) out[column] = [];
  const allowed = new Set(columns);
  for (const item of items) {
    const status = resolveApplicationStatus(item);
    if (!status || !allowed.has(status)) continue;
    out[status].push(item);
  }
  return out;
}
