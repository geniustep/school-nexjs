import type { AdmissionOutcomeFilter } from './admission-status-display';
import type { AdmissionUiStage } from './admission-ui-stage';

export type AdmissionsQuickFilterState = {
  stateFilter: AdmissionUiStage | '';
  outcomeFilter: AdmissionOutcomeFilter;
  offerStateFilter: string;
  page: number;
};

/** Applying a main/outcome filter clears conflicting stage (and related offer dims). */
export function applyOutcomeQuickFilter(
  current: AdmissionsQuickFilterState,
  filter: AdmissionOutcomeFilter,
): AdmissionsQuickFilterState {
  return {
    stateFilter: '',
    outcomeFilter: filter,
    offerStateFilter: '',
    page: 1,
  };
}

/** Applying a stage filter clears the registration/outcome quick filter. */
export function applyStageQuickFilter(
  current: AdmissionsQuickFilterState,
  stage: AdmissionUiStage | '',
): AdmissionsQuickFilterState {
  return {
    ...current,
    stateFilter: stage,
    outcomeFilter: '',
    page: 1,
  };
}

/** Chip removal always resets page to 1 and clears the matching dimension. */
export function clearOutcomeChip(current: AdmissionsQuickFilterState): AdmissionsQuickFilterState {
  return { ...current, outcomeFilter: '', page: 1 };
}

export function clearStageChip(current: AdmissionsQuickFilterState): AdmissionsQuickFilterState {
  return { ...current, stateFilter: '', page: 1 };
}

/** Non-conflicting filters (search / year / source / view) are preserved by callers. */
export function preserveNonConflictingFilters<T extends { search?: string; view?: string }>(
  preserved: T,
): T {
  return preserved;
}
