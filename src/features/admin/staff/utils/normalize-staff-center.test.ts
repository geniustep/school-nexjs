import { describe, expect, it } from 'vitest';
import {
  hasStaffAllowedAction,
  normalizeStaffAllowedActions,
} from '@/features/admin/staff/utils/staff-allowed-actions';
import {
  isStaffCenterParent,
  normalizeStaffCenterMember,
  resolveStaffCenterUserKind,
  resolveStaffUserId,
  staffUserTypeLabelKeys,
  unwrapStaffDetailResponse,
} from '@/features/admin/staff/utils/normalize-staff-center';
import type { StaffMember } from '@/types/academic-setup';

function baseMember(partial: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 10,
    name: 'Legacy Name',
    email: 'staff@example.com',
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

describe('normalizeStaffCenterMember', () => {
  it('prefers display_name and normalizes allowed_actions array', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        display_name: 'Display Name',
        allowed_actions: ['view', 'view_effective_permissions'],
        warnings: [{ code: 'account_without_scope' }],
      }),
    );

    expect(member.name).toBe('Display Name');
    expect(member.allowed_actions).toEqual(['view', 'view_effective_permissions']);
    expect(member.warnings?.[0]?.code).toBe('account_without_scope');
  });

  it('unwraps detail envelope with effective_permissions payload', () => {
    const parsed = unwrapStaffDetailResponse({
      item: baseMember({
        user_id: 42,
        display_name: 'Detail User',
      }),
      effective_permissions: {
        user_id: 42,
        effective_permissions: ['finance.view'],
        effective_capabilities: ['collect_payments'],
        warnings: [{ code: 'admin_staff_without_capabilities' }],
      },
    });

    expect(resolveStaffUserId(parsed.member)).toBe(42);
    expect(parsed.permissionsPayload?.effective_permissions).toEqual(['finance.view']);
    expect(parsed.permissionsPayload?.effective_capabilities).toEqual(['collect_payments']);
  });

  it('normalizes scope capability_codes from detail item', () => {
    const parsed = unwrapStaffDetailResponse({
      item: baseMember({
        scopes: [
          {
            school_id: 3,
            scope_type: 'classes',
            class_ids: [2058],
            capability_codes: ['view_homeworks', 'view_dashboard'],
          },
        ],
      }),
    });

    expect(parsed.member.scopes?.[0]?.capability_codes).toEqual([
      'view_homeworks',
      'view_dashboard',
    ]);
    expect(parsed.member.scopes?.[0]?.scope_type).toBe('classes');
  });

  it('CASE1: user_kind=parent + admin_kind=null → Parent, not Legacy Admin / Teacher', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'parent',
        is_parent: true,
        admin_kind: null,
        is_teacher: false,
        is_admin_staff: false,
        allowed_actions: ['view'],
      }),
    );

    expect(isStaffCenterParent(member)).toBe(true);
    expect(resolveStaffCenterUserKind(member)).toBe('parent');
    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.parent']);
    expect(staffUserTypeLabelKeys(member)).not.toContain('roles.adminKind.legacy_admin');
    expect(staffUserTypeLabelKeys(member)).not.toContain('admin.staffCenter.userType.teacher');
    expect(staffUserTypeLabelKeys(member)).not.toContain('admin.staffCenter.userType.admin');
    expect(member.admin_kind).toBeNull();
    expect(member.is_teacher).toBe(false);
  });

  it('CASE2: user_kind=parent wins over misleading admin_kind=legacy_admin', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'parent',
        is_parent: true,
        admin_kind: 'legacy_admin',
        allowed_actions: ['view'],
      }),
    );

    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.parent']);
    expect(isStaffCenterParent(member)).toBe(true);
    expect(member.is_admin_staff).toBe(false);
    expect(member.is_teacher).toBe(false);
  });

  it('CASE3: legacy payload with is_parent=true and no user_kind → Parent', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        is_parent: true,
        admin_kind: null,
        user_kind: undefined,
      }),
    );

    expect(resolveStaffCenterUserKind(member)).toBe('parent');
    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.parent']);
  });

  it('CASE4: real legacy_admin remains Legacy Admin', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'legacy_admin',
        admin_kind: 'legacy_admin',
        is_parent: false,
        is_admin_staff: true,
      }),
    );

    expect(staffUserTypeLabelKeys(member)).toEqual(['roles.adminKind.legacy_admin']);
    expect(isStaffCenterParent(member)).toBe(false);
  });

  it('CASE5: real teacher remains Teacher', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'teacher',
        admin_kind: null,
        is_teacher: true,
        teacher_id: 99,
      }),
    );

    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.teacher']);
    expect(member.is_teacher).toBe(true);
    expect(member.teacher_id).toBe(99);
  });

  it('CASE6: Parent allowed_actions=["view"] → view only, no edit/delete/manage', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'parent',
        is_parent: true,
        admin_kind: null,
        allowed_actions: ['view'],
      }),
    );
    const actions = normalizeStaffAllowedActions(member.allowed_actions);

    expect(actions).toEqual(['view']);
    expect(hasStaffAllowedAction(actions, 'view')).toBe(true);
    expect(hasStaffAllowedAction(actions, 'edit')).toBe(false);
    expect(hasStaffAllowedAction(actions, 'deactivate')).toBe(false);
    expect(hasStaffAllowedAction(actions, 'manage_permissions')).toBe(false);
    expect(hasStaffAllowedAction(actions, 'manage_scopes')).toBe(false);
  });

  it('CASE7: Parent stays in normalized list row (not dropped)', () => {
    const rows = [
      baseMember({ id: 1, user_kind: 'teacher', is_teacher: true, admin_kind: null }),
      baseMember({
        id: 2,
        user_kind: 'parent',
        is_parent: true,
        admin_kind: null,
        allowed_actions: ['view'],
      }),
      baseMember({ id: 3, user_kind: 'legacy_admin', admin_kind: 'legacy_admin' }),
    ].map(normalizeStaffCenterMember);

    expect(rows).toHaveLength(3);
    expect(rows.some((row) => isStaffCenterParent(row))).toBe(true);
    expect(rows.find((row) => row.id === 2)?.user_kind).toBe('parent');
  });

  it('CASE8: unknown future user_kind → unknown, not admin/teacher', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        user_kind: 'future_role_x',
        admin_kind: null,
        is_teacher: false,
        is_admin_staff: false,
      }),
    );

    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.unknown']);
    expect(staffUserTypeLabelKeys(member)).not.toContain('admin.staffCenter.userType.teacher');
    expect(staffUserTypeLabelKeys(member)).not.toContain('admin.staffCenter.userType.admin');
  });

  it('CASE9: admin_kind=null without user_kind/is_parent → not Legacy Admin / not Teacher', () => {
    const member = normalizeStaffCenterMember(
      baseMember({
        admin_kind: null,
        user_kind: undefined,
        is_parent: undefined,
        is_teacher: false,
        is_admin_staff: false,
        teacher_id: null,
      }),
    );

    expect(member.admin_kind).toBeNull();
    expect(staffUserTypeLabelKeys(member)).toEqual(['admin.staffCenter.userType.unknown']);
    expect(staffUserTypeLabelKeys(member)).not.toContain('roles.adminKind.legacy_admin');
    expect(staffUserTypeLabelKeys(member)).not.toContain('admin.staffCenter.userType.teacher');
  });

  it('CASE10: legacy admin_staff / teacher flags without user_kind do not regress', () => {
    const admin = normalizeStaffCenterMember(
      baseMember({
        admin_kind: 'admin_staff',
        is_admin_staff: true,
        user_kind: undefined,
      }),
    );
    const teacher = normalizeStaffCenterMember(
      baseMember({
        admin_kind: 'admin_staff',
        is_teacher: true,
        teacher_id: 7,
        user_kind: undefined,
      }),
    );

    expect(staffUserTypeLabelKeys(admin)).toContain('admin.staffCenter.userType.admin');
    expect(staffUserTypeLabelKeys(teacher)).toContain('admin.staffCenter.userType.teacher');
  });
});
