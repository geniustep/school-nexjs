import { describe, expect, it } from 'vitest';
import {
  hasStaffAllowedAction,
  normalizeStaffAllowedActions,
} from '@/features/admin/staff/utils/staff-allowed-actions';

describe('staff allowed actions', () => {
  it('normalizes string array from API', () => {
    expect(normalizeStaffAllowedActions(['view', 'edit', 'deactivate'])).toEqual([
      'view',
      'edit',
      'deactivate',
    ]);
  });

  it('normalizes boolean map from API', () => {
    expect(
      normalizeStaffAllowedActions({ view: true, edit: false, reactivate: true }),
    ).toEqual(['view', 'reactivate']);
  });

  it('checks allowed action membership only from API payload', () => {
    expect(hasStaffAllowedAction(['view'], 'edit')).toBe(false);
    expect(hasStaffAllowedAction(['view', 'edit'], 'edit')).toBe(true);
  });
});
