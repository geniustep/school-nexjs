import { describe, expect, it } from 'vitest';
import {
  countHiddenConvertedAdmissionListItems,
  filterAdmissionListItems,
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
  it('hides converted admissions by default', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, true)).toEqual([items[0]]);
  });

  it('keeps converted admissions when hideConverted is disabled', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, false)).toEqual(items);
  });

  it('still hides converted admissions during search unless filter is cleared', () => {
    const items = [makeItem(1), makeItem(2, 100)];
    expect(filterAdmissionListItems(items, true)).toEqual([items[0]]);
  });

  it('counts hidden converted rows', () => {
    const items = [makeItem(1), makeItem(2, 100), makeItem(3, 200)];
    expect(countHiddenConvertedAdmissionListItems(items, true)).toBe(2);
    expect(countHiddenConvertedAdmissionListItems(items, false)).toBe(0);
  });
});
