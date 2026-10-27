import { describe, expect, it } from 'vitest';
import {
  hasStaffAllowedAction,
  normalizeStaffAllowedActions,
  staffActionNavigationHref,
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

  it('links permission and scope management to the existing staff editor', () => {
    expect(staffActionNavigationHref('manage_permissions', 44)).toBe('/admin/staff/44/edit#staff-permissions');
    expect(staffActionNavigationHref('manage_scopes', 44)).toBe('/admin/staff/44/edit#staff-responsibilities');
    expect(staffActionNavigationHref('view_effective_permissions', 44)).toBe('#staff-effective-permissions');
    expect(staffActionNavigationHref('manage_permissions', 44, 'general_supervisor')).toBe('/admin/staff/44/edit#staff-responsibilities');
    expect(staffActionNavigationHref('deactivate', 44)).toBeNull();
  });
});
