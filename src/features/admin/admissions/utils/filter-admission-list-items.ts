import type { AdmissionListItem } from '@/types/admission';
import { isAdmissionConvertedToStudent } from './admission-registration';

export function filterAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted: boolean,
): AdmissionListItem[] {
  if (!hideConverted) return items;
  return items.filter((item) => !isAdmissionConvertedToStudent(item));
}

export function countVisibleAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted: boolean,
): number {
  return filterAdmissionListItems(items, hideConverted).length;
}

export function countHiddenConvertedAdmissionListItems(
  items: AdmissionListItem[],
  hideConverted: boolean,
): number {
  if (!hideConverted) return 0;
  return items.filter((item) => isAdmissionConvertedToStudent(item)).length;
}

export function hasActiveAdmissionListFilters(options: {
  search?: string;
  stateFilter?: string;
  showClosed?: boolean;
  hideConverted?: boolean;
}): boolean {
  return !!(
    options.search?.trim() ||
    options.stateFilter ||
    options.showClosed ||
    options.hideConverted === false
  );
}
