import { describe, expect, it } from 'vitest';
import {
  areAllVisibleAdmissionsSelected,
  areSomeVisibleAdmissionsSelected,
  deselectAllVisibleAdmissionIds,
  selectAllVisibleAdmissionIds,
  toggleAdmissionSelection,
} from '@/features/admin/admissions/utils/admissions-selection';

describe('admissions selection helpers', () => {
  it('toggles a single id', () => {
    expect(toggleAdmissionSelection(new Set(), 5)).toEqual(new Set([5]));
    expect(toggleAdmissionSelection(new Set([5]), 5)).toEqual(new Set());
  });

  it('selects and deselects only visible ids', () => {
    const selected = selectAllVisibleAdmissionIds(new Set([99]), [1, 2]);
    expect([...selected].sort()).toEqual([1, 2, 99]);

    const cleared = deselectAllVisibleAdmissionIds(selected, [1, 2]);
    expect([...cleared]).toEqual([99]);
  });

  it('reports visible selection state for header checkbox', () => {
    const selected = new Set([1, 2]);
    expect(areAllVisibleAdmissionsSelected(selected, [1, 2])).toBe(true);
    expect(areSomeVisibleAdmissionsSelected(selected, [1, 2, 3])).toBe(true);
    expect(areAllVisibleAdmissionsSelected(selected, [1, 2, 3])).toBe(false);
  });
});
