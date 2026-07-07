import type { AdmissionListItem, AdmissionState } from '@/types/admission';
import { ACTIVE_KANBAN_STATES, CLOSED_KANBAN_STATES } from './admission-labels';
import { isAdmissionConvertedToStudent } from './admission-registration';

/** Raw-state kanban column shape used when grouping into UI stages. */
export interface RawKanbanColumn {
  state: string;
  items: AdmissionListItem[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

/** Simplified pipeline stages shown in the admissions list UI. */
export type AdmissionUiStage =
  | 'new'
  | 'in_follow_up'
  | 'in_evaluation'
  | 'accepted'
  | 'ready_for_registration'
  | 'registered'
  | 'closed';

export const ACTIVE_UI_STAGES: AdmissionUiStage[] = [
  'new',
  'in_follow_up',
  'in_evaluation',
  'accepted',
  'ready_for_registration',
  'registered',
];

export const CLOSED_UI_STAGE: AdmissionUiStage = 'closed';

export const REGISTERED_UI_STAGE: AdmissionUiStage = 'registered';

export const ALL_UI_STAGES: AdmissionUiStage[] = [...ACTIVE_UI_STAGES, CLOSED_UI_STAGE];

/** Kanban column list from toolbar filters — hides empty registered/closed columns when appropriate. */
export function resolveKanbanDisplayStages(options: {
  showClosed: boolean;
  hideConverted: boolean;
  stateFilter?: AdmissionUiStage | '';
}): AdmissionUiStage[] {
  const showClosedColumn =
    options.showClosed || options.stateFilter === CLOSED_UI_STAGE;

  let stages = ACTIVE_UI_STAGES.filter(
    (stage) => !(options.hideConverted && stage === REGISTERED_UI_STAGE),
  );

  if (showClosedColumn) {
    stages = [...stages, CLOSED_UI_STAGE];
  }

  return stages;
}

const RAW_STATE_TO_UI_STAGE: Partial<Record<AdmissionState, AdmissionUiStage>> = {
  new: 'new',
  contacted: 'in_follow_up',
  qualified: 'in_follow_up',
  visit_pending: 'in_follow_up',
  under_review: 'in_evaluation',
  waitlisted: 'in_evaluation',
  accepted: 'accepted',
  offer_sent: 'accepted',
  confirmed: 'ready_for_registration',
  lost: 'closed',
  cancelled: 'closed',
  duplicate: 'closed',
};

export type AdmissionUiStageSource = Pick<
  AdmissionListItem,
  'state' | 'student_id' | 'registration_flow_state'
>;

/** Maps a list item to its display stage. Registered overrides any raw state. */
export function resolveAdmissionUiStage(item: AdmissionUiStageSource): AdmissionUiStage {
  if (isAdmissionConvertedToStudent(item)) return 'registered';

  const mapped = RAW_STATE_TO_UI_STAGE[item.state as AdmissionState];
  return mapped ?? 'new';
}

/** Raw states to query for a UI stage filter. Empty for registered — fetch all active states. */
export function rawStatesForUiStageFetch(stage: AdmissionUiStage): AdmissionState[] {
  switch (stage) {
    case 'new':
      return ['new'];
    case 'in_follow_up':
      return ['contacted', 'qualified', 'visit_pending'];
    case 'in_evaluation':
      return ['under_review', 'waitlisted'];
    case 'accepted':
      return ['accepted', 'offer_sent'];
    case 'ready_for_registration':
      return ['confirmed'];
    case 'registered':
      return [];
    case 'closed':
      return [...CLOSED_KANBAN_STATES];
  }
}

/** Union of raw states needed to populate the given UI stage columns. */
export function rawStatesForUiStageColumns(stages: AdmissionUiStage[]): AdmissionState[] {
  const states = new Set<AdmissionState>();
  for (const stage of stages) {
    const raw = rawStatesForUiStageFetch(stage);
    if (raw.length === 0) {
      ACTIVE_KANBAN_STATES.forEach((s) => states.add(s));
    } else {
      raw.forEach((s) => states.add(s));
    }
  }
  return [...states];
}

export function admissionUiStageTone(
  stage: AdmissionUiStage,
): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  switch (stage) {
    case 'registered':
    case 'accepted':
    case 'ready_for_registration':
      return 'green';
    case 'closed':
      return 'red';
    case 'in_evaluation':
      return 'amber';
    case 'in_follow_up':
      return 'blue';
    default:
      return 'slate';
  }
}

export function itemMatchesUiStageFilter(
  item: AdmissionUiStageSource,
  stageFilter: AdmissionUiStage,
): boolean {
  return resolveAdmissionUiStage(item) === stageFilter;
}

export interface AdmissionsUiKanbanColumn {
  stage: AdmissionUiStage;
  items: AdmissionListItem[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}

function dedupeById(items: AdmissionListItem[]): AdmissionListItem[] {
  const seen = new Set<number>();
  const out: AdmissionListItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function groupKanbanColumnsByUiStage(
  rawColumns: RawKanbanColumn[],
  displayStages: AdmissionUiStage[],
): AdmissionsUiKanbanColumn[] {
  const allItems = dedupeById(rawColumns.flatMap((col) => col.items));

  return displayStages.map((stage) => {
    const items = allItems.filter((item) => resolveAdmissionUiStage(item) === stage);
    const underlyingRawStates = rawStatesForUiStageFetch(stage);
    const underlying =
      stage === 'registered'
        ? rawColumns
        : rawColumns.filter((col) =>
            underlyingRawStates.includes(col.state as AdmissionState),
          );

    return {
      stage,
      items,
      total: items.length,
      hasMore: underlying.some((col) => col.hasMore),
      loading: underlying.some((col) => col.loading),
      loadingMore: underlying.some((col) => col.loadingMore),
    };
  });
}

/** Pick a raw-state column that still has more pages for the given UI stage. */
export function pickRawStateForUiStageLoadMore(
  stage: AdmissionUiStage,
  rawColumns: RawKanbanColumn[],
): string | null {
  const underlyingRawStates = rawStatesForUiStageFetch(stage);
  const candidates =
    stage === 'registered'
      ? rawColumns
      : rawColumns.filter((col) =>
          underlyingRawStates.includes(col.state as AdmissionState),
        );

  const withMore = candidates.find((col) => col.hasMore && !col.loadingMore);
  return withMore?.state ?? null;
}
