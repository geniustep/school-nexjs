import { describe, expect, it } from 'vitest';
import {
  filterAdmissionListItems,
  countHiddenConvertedAdmissionListItems,
  filterClosedAdmissionListItems,
  hasActiveAdmissionListFilters,
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
  it('does not hide registered admissions client-side (pagination-safe)', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, true)).toEqual(items);
    expect(countHiddenConvertedAdmissionListItems(items, true)).toBe(0);
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

  it('tracks active filters without showClosed / registered-visible chips', () => {
    expect(hasActiveAdmissionListFilters({ search: 'a' })).toBe(true);
    expect(hasActiveAdmissionListFilters({ outcomeFilter: 'registered' })).toBe(true);
    expect(hasActiveAdmissionListFilters({})).toBe(false);
  });
});
