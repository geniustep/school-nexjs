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

/** Empty status columns (0 pupils) are hidden until a card is being dragged. */
export function isKanbanColumnVacant(column: {
  total: number;
  items: readonly unknown[];
  loading: boolean;
}): boolean {
  return !column.loading && column.total === 0 && column.items.length === 0;
}

/**
 * Idle: hide vacant columns.
 * Dragging: reveal vacant columns as faint drop slots (`isGhost`) only when they
 * are allowed for the dragged card (`allowedTargetIds` from Backend Payload).
 * `registered` never appears as a ghost drop slot.
 */
export function visibleKanbanColumnsForBoard<T extends {
  id: string;
  total: number;
  items: readonly unknown[];
  loading: boolean;
}>(
  columns: readonly T[],
  options: {
    dragging: boolean;
    /** Official statuses from `allowed_status_targets` for the dragged card. */
    allowedTargetIds?: readonly string[] | null;
  },
): Array<T & { isGhost: boolean }> {
  if (!options.dragging) {
    return columns
      .filter((column) => !isKanbanColumnVacant(column))
      .map((column) => ({ ...column, isGhost: false }));
  }

  const allowed = options.allowedTargetIds;
  return columns
    .filter((column) => {
      if (!isKanbanColumnVacant(column)) return true;
      if (column.id === 'registered') return false;
      if (allowed == null) return true;
      return allowed.includes(column.id);
    })
    .map((column) => ({
      ...column,
      isGhost: isKanbanColumnVacant(column),
    }));
}

/** Drop highlight for a column while dragging — respects Backend targets. */
export function isKanbanColumnDroppableForDrag(input: {
  columnId: string;
  allowDrag: boolean;
  dragging: boolean;
  allowedTargetIds: readonly string[] | null | undefined;
  dropStage: string | null;
  isDropTargetState: (state: string) => boolean;
}): boolean {
  const { columnId, allowDrag, dragging, allowedTargetIds, dropStage, isDropTargetState } =
    input;
  if (!allowDrag || !dragging || dropStage == null || dropStage !== columnId) return false;
  if (!isDropTargetState(dropStage)) return false;
  if (allowedTargetIds == null) return true;
  return allowedTargetIds.includes(dropStage);
}

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

/**
 * Drop target = official application_status column id.
 * `registered` is never a drop target (terminal conversion).
 */
export function presentationColumnDropStage(
  columnId: AdmissionKanbanPresentationColumnId,
): string | null {
  if (!columnId || columnId === 'registered') return null;
  if (MODERN_STATUS_COLUMNS.has(columnId)) return columnId;
  return columnId;
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
