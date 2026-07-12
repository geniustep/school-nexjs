import type { AdmissionListItem } from '@/types/admission';
import { CLOSED_UI_STAGE, resolveAdmissionUiStage } from './admission-ui-stage';
import { outcomeFilterNeedsClosed, type AdmissionOutcomeFilter } from './admission-status-display';

/** @deprecated Client-side hideConverted after pagination is removed from the list UI. */
export function filterAdmissionListItems(
  items: AdmissionListItem[],
  _hideConverted?: boolean,
): AdmissionListItem[] {
  return items;
}

export function countVisibleAdmissionListItems(
  items: AdmissionListItem[],
  _hideConverted?: boolean,
): number {
  return items.length;
}

export function countHiddenConvertedAdmissionListItems(
  _items: AdmissionListItem[],
  _hideConverted?: boolean,
): number {
  return 0;
}

/** Exclude closed applications unless an explicit closed-targeting filter is active. */
export function filterClosedAdmissionListItems(
  items: AdmissionListItem[],
  includeClosed: boolean,
): AdmissionListItem[] {
  if (includeClosed) return items;
  return items.filter((item) => resolveAdmissionUiStage(item) !== CLOSED_UI_STAGE);
}

export function shouldIncludeClosedAdmissions(options: {
  outcomeFilter?: AdmissionOutcomeFilter;
  stateFilter?: string;
}): boolean {
  if (options.stateFilter === CLOSED_UI_STAGE) return true;
  if (options.outcomeFilter && outcomeFilterNeedsClosed(options.outcomeFilter)) return true;
  return false;
}

export function hasActiveAdmissionListFilters(options: {
  search?: string;
  stateFilter?: string;
  outcomeFilter?: string;
  offerStateFilter?: string;
}): boolean {
  return !!(
    options.search?.trim() ||
    options.stateFilter ||
    options.outcomeFilter ||
    options.offerStateFilter
  );
}
