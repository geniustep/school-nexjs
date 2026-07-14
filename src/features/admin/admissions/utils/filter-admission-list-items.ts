import type { AdmissionListItem } from '@/types/admission';
import {
  isRegisteredApplicationStatus,
  resolveApplicationStatus,
} from './admission-modern-status';
import { CLOSED_UI_STAGE, resolveAdmissionUiStage } from './admission-ui-stage';
import { outcomeFilterNeedsClosed, type AdmissionOutcomeFilter } from './admission-status-display';

/**
 * Defensive visibility check for hideConverted.
 * Hides only `application_status=registered` — never readiness or student_id alone.
 * Prefer server-side exclusion via application_status query; avoid post-pagination use.
 */
export function isHiddenConvertedAdmissionItem(
  item: Pick<AdmissionListItem, 'application_status'> | null | undefined,
): boolean {
  return isRegisteredApplicationStatus(resolveApplicationStatus(item));
}

/** Hide converted/registered applications when the default filter is on. */
export function filterAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted = true,
): AdmissionListItem[] {
  if (!hideConverted) return items;
  return items.filter((item) => !isHiddenConvertedAdmissionItem(item));
}

export function countVisibleAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted = true,
): number {
  return filterAdmissionListItems(items, hideConverted).length;
}

export function countHiddenConvertedAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted = true,
): number {
  if (!hideConverted) return 0;
  return items.filter((item) => isHiddenConvertedAdmissionItem(item)).length;
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
  /** false = registered are visible (non-default). */
  hideConverted?: boolean;
}): boolean {
  return !!(
    options.search?.trim() ||
    options.stateFilter ||
    options.outcomeFilter ||
    options.offerStateFilter ||
    options.hideConverted === false
  );
}

/**
 * Effective hide-registered flag for the current workspace view.
 * Explicit registered queues must always show application_status=registered.
 */
export function resolveEffectiveHideConverted(options: {
  hideConverted?: boolean;
  workspace?: string;
  postSub?: string;
  closedSub?: string;
}): boolean {
  if (options.workspace === 'post_acceptance' && options.postSub === 'registered') {
    return false;
  }
  if (options.workspace === 'closed' && options.closedSub === 'registered') {
    return false;
  }
  return options.hideConverted !== false;
}
