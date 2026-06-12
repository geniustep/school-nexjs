import { describe, expect, it } from 'vitest';
import { mapAcademicSetupApiError } from './api-errors';
import {
  buildStaffListQuery,
  isStaffInactive,
  normalizeStaffMember,
  parseStaffStatusFilter,
  staffEmptyStateKey,
  staffMutationSuccessKey,
} from './staff-utils';
import {
  staffShowsDeactivate,
  staffShowsReactivate,
} from '../components/staff-reactivate-dialog';
import type { StaffMember } from '@/types/academic-setup';

const t = (key: string) => `__${key}__`;

function member(partial: Partial<StaffMember> & Pick<StaffMember, 'id' | 'name'>): StaffMember {
  return {
    email: null,
    phone: null,
    job_title: null,
    admin_kind: 'admin_staff',
    active: true,
    account_status: 'active',
    schools: [],
    default_school: null,
    permissions: [],
    ...partial,
  };
}

describe('parseStaffStatusFilter', () => {
  it('defaults to active for missing or invalid values', () => {
    expect(parseStaffStatusFilter(null)).toBe('active');
    expect(parseStaffStatusFilter(undefined)).toBe('active');
    expect(parseStaffStatusFilter('')).toBe('active');
    expect(parseStaffStatusFilter('deleted')).toBe('active');
  });

  it('accepts valid status filters', () => {
    expect(parseStaffStatusFilter('active')).toBe('active');
    expect(parseStaffStatusFilter('inactive')).toBe('inactive');
    expect(parseStaffStatusFilter('all')).toBe('all');
  });
});

describe('buildStaffListQuery', () => {
  it('always includes status and limit', () => {
    expect(buildStaffListQuery({ status: 'inactive' })).toEqual({
      status: 'inactive',
      limit: 100,
    });
  });

  it('includes trimmed search when provided', () => {
    expect(buildStaffListQuery({ status: 'all', search: '  ali  ' })).toEqual({
      status: 'all',
      limit: 100,
      search: 'ali',
    });
  });

  it('omits empty search', () => {
    expect(buildStaffListQuery({ status: 'active', search: '   ' })).toEqual({
      status: 'active',
      limit: 100,
    });
  });
});

describe('normalizeStaffMember', () => {
  it('preserves explicit active flag and capability flags', () => {
    const normalized = normalizeStaffMember(
      member({
        id: 1,
        name: 'A',
        active: false,
        can_deactivate: false,
        can_reactivate: true,
      }),
    );
    expect(normalized.active).toBe(false);
    expect(normalized.can_deactivate).toBe(false);
    expect(normalized.can_reactivate).toBe(true);
  });

  it('derives login from account when missing on row', () => {
    const normalized = normalizeStaffMember(
      member({
        id: 2,
        name: 'B',
        login: null,
        account: { status: 'inactive', login: 'staff@example.com', user_id: 1 },
      }),
    );
    expect(normalized.login).toBe('staff@example.com');
  });

  it('falls back active from account_status for legacy rows', () => {
    const normalized = normalizeStaffMember(
      member({
        id: 3,
        name: 'C',
        active: undefined as unknown as boolean,
        account_status: 'inactive',
      }),
    );
    expect(normalized.active).toBe(false);
    expect(normalized.can_reactivate).toBe(true);
  });
});

describe('isStaffInactive', () => {
  it('detects inactive by active flag or account_status', () => {
    expect(isStaffInactive(member({ id: 1, name: 'A', active: false }))).toBe(true);
    expect(
      isStaffInactive(member({ id: 2, name: 'B', active: true, account_status: 'inactive' })),
    ).toBe(true);
    expect(isStaffInactive(member({ id: 3, name: 'C', active: true }))).toBe(false);
  });
});

describe('staffMutationSuccessKey', () => {
  it('maps staff mutation actions to i18n keys', () => {
    expect(staffMutationSuccessKey('reactivated')).toBe('admin.academicSetup.staffReactivated');
    expect(staffMutationSuccessKey('already_active')).toBe('admin.academicSetup.staffAlreadyActive');
    expect(staffMutationSuccessKey('deactivated')).toBe('admin.academicSetup.staffDeactivated');
    expect(staffMutationSuccessKey('already_inactive')).toBe('admin.academicSetup.staffAlreadyInactive');
    expect(staffMutationSuccessKey(undefined)).toBeNull();
  });
});

describe('staffEmptyStateKey', () => {
  it('selects empty state by filter and search', () => {
    expect(staffEmptyStateKey('active', false)).toBe('admin.academicSetup.noActiveStaff');
    expect(staffEmptyStateKey('inactive', false)).toBe('admin.academicSetup.noInactiveStaff');
    expect(staffEmptyStateKey('all', false)).toBe('admin.academicSetup.noStaff');
    expect(staffEmptyStateKey('inactive', true)).toBe('admin.academicSetup.noStaffSearchResults');
  });
});

describe('staff action visibility', () => {
  it('shows reactivate only when allowed and inactive', () => {
    const inactive = member({
      id: 10,
      name: 'Inactive',
      active: false,
      can_reactivate: true,
    });
    expect(staffShowsReactivate(inactive, true)).toBe(true);
    expect(staffShowsReactivate(inactive, false)).toBe(false);
    expect(
      staffShowsReactivate(member({ id: 11, name: 'Active', can_reactivate: true }), true),
    ).toBe(false);
    expect(
      staffShowsReactivate(
        member({ id: 12, name: 'Blocked', active: false, can_reactivate: false }),
        true,
      ),
    ).toBe(false);
  });

  it('shows deactivate only when allowed and active', () => {
    const active = member({ id: 20, name: 'Active', can_deactivate: true });
    expect(staffShowsDeactivate(active, true)).toBe(true);
    expect(staffShowsDeactivate(active, false)).toBe(false);
    expect(
      staffShowsDeactivate(member({ id: 21, name: 'Protected', can_deactivate: false }), true),
    ).toBe(false);
    expect(
      staffShowsDeactivate(
        member({ id: 22, name: 'Inactive', active: false, can_deactivate: true }),
        true,
      ),
    ).toBe(false);
  });
});

describe('mapAcademicSetupApiError staff codes', () => {
  it('maps staff reactivation and protection errors', () => {
    expect(
      mapAcademicSetupApiError({ code: 'protected_account', message: '' }, t, 'staff'),
    ).toBe('__admin.academicSetup.errors.protectedAccount__');
    expect(
      mapAcademicSetupApiError({ code: 'cannot_reactivate', message: '' }, t, 'staff'),
    ).toBe('__admin.academicSetup.errors.cannotReactivate__');
    expect(
      mapAcademicSetupApiError({ code: 'staff_not_found', message: '' }, t, 'staff'),
    ).toBe('__admin.academicSetup.errors.staffNotFound__');
    expect(
      mapAcademicSetupApiError({ code: 'already_active', message: '' }, t, 'staff'),
    ).toBe('__admin.academicSetup.staffAlreadyActive__');
  });
});
