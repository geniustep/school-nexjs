import { describe, expect, it } from 'vitest';
import {
  filterAdmissionListItems,
  countHiddenConvertedAdmissionListItems,
  filterClosedAdmissionListItems,
  hasActiveAdmissionListFilters,
  resolveEffectiveHideConverted,
  shouldIncludeClosedAdmissions,
} from '@/features/admin/admissions/utils/filter-admission-list-items';
import type { AdmissionListItem } from '@/types/admission';

function makeItem(id: number, studentId?: number | false | null): AdmissionListItem {
  return {
    id,
    student_name: `Student ${id}`,
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    student_id: studentId,
  };
}

describe('filterAdmissionListItems', () => {
  it('hides registered admissions by default', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, true)).toEqual([makeItem(1)]);
    expect(countHiddenConvertedAdmissionListItems(items, true)).toBe(1);
  });

  it('keeps registered admissions when hideConverted is off', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, false)).toEqual(items);
    expect(countHiddenConvertedAdmissionListItems(items, false)).toBe(0);
  });

  it('excludes closed unless includeClosed is true', () => {
    const items = [
      makeItem(1),
      { ...makeItem(2), state: 'lost' as const },
    ];
    expect(filterClosedAdmissionListItems(items, false)).toHaveLength(1);
    expect(filterClosedAdmissionListItems(items, true)).toHaveLength(2);
  });

  it('includes closed automatically for rejected outcome', () => {
    expect(shouldIncludeClosedAdmissions({ outcomeFilter: 'school_rejected' })).toBe(true);
  });

  it('tracks show-registered as an active filter', () => {
    expect(hasActiveAdmissionListFilters({ search: 'a' })).toBe(true);
    expect(hasActiveAdmissionListFilters({ outcomeFilter: 'registered' })).toBe(true);
    expect(hasActiveAdmissionListFilters({ hideConverted: false })).toBe(true);
    expect(hasActiveAdmissionListFilters({})).toBe(false);
  });

  it('forces show registered inside post_acceptance registered subfilter', () => {
    expect(
      resolveEffectiveHideConverted({
        hideConverted: true,
        workspace: 'post_acceptance',
        postSub: 'registered',
      }),
    ).toBe(false);
    expect(
      resolveEffectiveHideConverted({
        hideConverted: true,
        workspace: 'follow_up',
      }),
    ).toBe(true);
  });
});
