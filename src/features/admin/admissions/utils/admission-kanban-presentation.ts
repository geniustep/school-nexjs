/**
 * Presentation Kanban: four visible columns without changing Backend processing_stage enums.
 */

import type { AdmissionListItem } from '@/types/admission';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';

export type AdmissionKanbanPresentationColumnId =
  | 'new'
  | 'initial_follow_up'
  | 'assessment'
  | 'decision';

export type AdmissionKanbanPresentationColumnDef = {
  id: AdmissionKanbanPresentationColumnId;
  /** Backend processing_stage values grouped into this column. */
  backendStages: readonly string[];
  labelKey: string;
};

export const ADMISSION_KANBAN_PRESENTATION_COLUMNS: readonly AdmissionKanbanPresentationColumnDef[] =
  [
    {
      id: 'new',
      backendStages: ['new'],
      labelKey: 'admin.admissions.kanbanColumns.new',
    },
    {
      id: 'initial_follow_up',
      backendStages: ['initial_follow_up'],
      labelKey: 'admin.admissions.kanbanColumns.initial_follow_up',
    },
    {
      id: 'assessment',
      backendStages: ['assessment_ready', 'assessment_in_progress'],
      labelKey: 'admin.admissions.kanbanColumns.assessment',
    },
    {
      id: 'decision',
      backendStages: ['decision_ready'],
      labelKey: 'admin.admissions.kanbanColumns.decision',
    },
  ] as const;

/** Flat list of backend stages to fetch for the four-column board. */
export function admissionKanbanFetchStages(): string[] {
  return ADMISSION_KANBAN_PRESENTATION_COLUMNS.flatMap((col) => [...col.backendStages]);
}

export type AdmissionKanbanPresentationColumn = {
  id: AdmissionKanbanPresentationColumnId;
  labelKey: string;
  backendStages: readonly string[];
  items: AdmissionListItem[];
  /** Sum of backend stage totals after current filters. */
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: AdmissionsKanbanColumn['error'];
  /** Prefer loading more from the first stage that still has pages. */
  loadMoreStage: string | null;
};

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

export function groupKanbanColumnsForPresentation(
  rawColumns: AdmissionsKanbanColumn[],
): AdmissionKanbanPresentationColumn[] {
  const byStage = new Map(rawColumns.map((col) => [col.state, col]));

  return ADMISSION_KANBAN_PRESENTATION_COLUMNS.map((def) => {
    const parts = def.backendStages.map(
      (stage) =>
        byStage.get(stage) ??
        ({
          state: stage,
          items: [],
          total: 0,
          page: 0,
          hasMore: false,
          loading: false,
          loadingMore: false,
          error: null,
        } satisfies AdmissionsKanbanColumn),
    );

    const items = dedupeItems(parts.flatMap((part) => part.items));
    const total = parts.reduce((sum, part) => sum + (part.total || 0), 0);
    const loadMoreStage =
      parts.find((part) => part.hasMore && !part.loadingMore)?.state ??
      parts.find((part) => part.hasMore)?.state ??
      null;

    return {
      id: def.id,
      labelKey: def.labelKey,
      backendStages: def.backendStages,
      items,
      total,
      loading: parts.some((part) => part.loading && part.items.length === 0),
      loadingMore: parts.some((part) => part.loadingMore),
      hasMore: parts.some((part) => part.hasMore),
      error: parts.map((part) => part.error).find((err) => err != null) ?? null,
      loadMoreStage,
    };
  });
}

/** Drop target mapping: presentation column → preferred backend stage for drag. */
export function presentationColumnDropStage(
  columnId: AdmissionKanbanPresentationColumnId,
): string | null {
  switch (columnId) {
    case 'new':
      return 'new';
    case 'initial_follow_up':
      return 'initial_follow_up';
    case 'assessment':
      // Do not silently coerce to assessment_in_progress.
      return 'assessment_ready';
    case 'decision':
      return null;
    default:
      return null;
  }
}

export function resolveAdmissionProcessingStageBadgeKey(
  item: Pick<AdmissionListItem, 'processing_stage' | 'state'>,
): string | null {
  const stage = String(item.processing_stage ?? '').trim();
  if (
    stage === 'assessment_ready' ||
    stage === 'assessment_in_progress' ||
    stage === 'new' ||
    stage === 'initial_follow_up' ||
    stage === 'decision_ready'
  ) {
    return `admin.admissions.processingStages.${stage}`;
  }
  return null;
}
