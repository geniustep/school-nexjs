/**
 * Presentation Kanban: one visible column per official application_status.
 * Legacy processing_stage presentation merge is retained only as a fallback for
 * unexpected column ids — modern boards pass application_status columns.
 */

import type { AdmissionListItem } from '@/types/admission';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';
import { applicationStatusLabelKey } from './admission-modern-status';
import { statusesForWorkspace } from './admission-modern-status';

export type AdmissionKanbanPresentationColumnId = string;

export type AdmissionKanbanPresentationColumnDef = {
  id: AdmissionKanbanPresentationColumnId;
  /** Server application_status values grouped into this column. */
  backendStages: readonly string[];
  labelKey: string;
};

const MODERN_STATUS_COLUMNS = new Set([
  'new',
  'follow_up',
  'in_assessment',
  'decision_pending',
  'waitlisted',
  'accepted',
  'ready_for_registration',
  'registered',
  'rejected',
  'closed',
]);

/** Flat list of statuses to fetch for the follow_up board. */
export function admissionKanbanFetchStages(
  workspace: 'follow_up' | 'awaiting_decision' = 'follow_up',
): string[] {
  return statusesForWorkspace(workspace);
}

/** Visible presentation columns for follow_up skeleton / defaults. */
export const ADMISSION_KANBAN_PRESENTATION_COLUMNS: readonly AdmissionKanbanPresentationColumnDef[] =
  statusesForWorkspace('follow_up').map((status) => ({
    id: status,
    backendStages: [status],
    labelKey: applicationStatusLabelKey(status),
  }));


export type AdmissionKanbanPresentationColumn = {
  id: AdmissionKanbanPresentationColumnId;
  labelKey: string;
  backendStages: readonly string[];
  items: AdmissionListItem[];
  /** Sum of backend status totals after current filters. */
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: AdmissionsKanbanColumn['error'];
  /** Prefer loading more from the first status that still has pages. */
  loadMoreStage: string | null;
};

function emptyColumn(state: string): AdmissionsKanbanColumn {
  return {
    state,
    items: [],
    total: 0,
    page: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
  };
}

function dedupeItems(items: AdmissionListItem[]): AdmissionListItem[] {
  const seen = new Set<number>();
  const out: AdmissionListItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * Map raw kanban fetches into presentation columns.
 * Modern path: 1:1 application_status columns (no processing_stage merge).
 */
export function groupKanbanColumnsForPresentation(
  rawColumns: AdmissionsKanbanColumn[],
): AdmissionKanbanPresentationColumn[] {
  if (rawColumns.length === 0) return [];

  const modern = rawColumns.every((col) => MODERN_STATUS_COLUMNS.has(col.state));
  if (modern) {
    return rawColumns.map((col) => ({
      id: col.state,
      labelKey: applicationStatusLabelKey(col.state),
      backendStages: [col.state],
      items: col.items,
      total: col.total || 0,
      loading: col.loading && col.items.length === 0,
      loadingMore: col.loadingMore,
      hasMore: col.hasMore,
      error: col.error,
      loadMoreStage: col.hasMore ? col.state : null,
    }));
  }

  // Fallback: keep each raw column as its own presentation column.
  return rawColumns.map((col) => {
    const parts = [col];
    const items = dedupeItems(parts.flatMap((part) => part.items));
    return {
      id: col.state,
      labelKey: applicationStatusLabelKey(col.state),
      backendStages: [col.state],
      items,
      total: parts.reduce((sum, part) => sum + (part.total || 0), 0),
      loading: parts.some((part) => part.loading && part.items.length === 0),
      loadingMore: parts.some((part) => part.loadingMore),
      hasMore: parts.some((part) => part.hasMore),
      error: parts.map((part) => part.error).find((err) => err != null) ?? null,
      loadMoreStage:
        parts.find((part) => part.hasMore && !part.loadingMore)?.state ??
        parts.find((part) => part.hasMore)?.state ??
        null,
    };
  });
}

/** Drop target mapping — drag disabled; returns null for modern boards. */
export function presentationColumnDropStage(
  columnId: AdmissionKanbanPresentationColumnId,
): string | null {
  if (MODERN_STATUS_COLUMNS.has(columnId)) return null;
  return null;
}

export function resolveAdmissionProcessingStageBadgeKey(
  item: { application_status?: string | null; processing_stage?: string | null },
): string {
  if (item.application_status) {
    return applicationStatusLabelKey(item.application_status);
  }
  if (item.processing_stage) {
    return `admin.admissions.processingStages.${item.processing_stage}`;
  }
  return 'admin.admissions.applicationStatus.new';
}

export { emptyColumn };
