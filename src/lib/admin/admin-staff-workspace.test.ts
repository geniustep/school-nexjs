import { describe, expect, it } from 'vitest';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import {
  filterAdminStaffWorkspaceActionItems,
  REGISTRATION_COLLECTIONS_TEMPLATE_CODE,
  resolveAdminStaffWorkspace,
} from '@/lib/admin/admin-staff-workspace';
import type { CurrentUser } from '@/types/user';

function staff(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 9497,
    name: 'مسؤول التسجيل والتحصيلات',
    email: 'staff@test.ma',
    role: 'admin',
    admin_kind: 'admin_staff',
    permissions: ['view_dashboard'],
    school: { id: 3, name: 'School' },
    ...overrides,
  };
}

describe('admin staff operational workspace', () => {
  it('resolves registration + collections from the canonical creation template code', () => {
    const user = staff({
      creation_template_code: REGISTRATION_COLLECTIONS_TEMPLATE_CODE,
      permissions: [
        'view_dashboard',
        'view_students',
        'manage_students',
        'view_attendance',
        'manage_attendance',
        'view_teachers',
        'view_parents',
        'view_classes',
        'view_channels',
        'admission.view',
        'finance.view',
      ],
    });

    const workspace = resolveAdminStaffWorkspace(user);

    expect(workspace?.id).toBe('registration_collections');
    expect(workspace?.primaryDomains).toEqual(['registration', 'collections']);
    expect(workspace?.showAttendanceOperations).toBe(false);
    expect(workspace?.showAcademicActivity).toBe(false);
    expect(workspace?.showLatestMessages).toBe(true);
  });

  it('does not infer responsibility from the Arabic display label', () => {
    const user = staff({
      name: 'مسؤول التسجيل والتحصيلات',
      creation_template_code: 'another_admin_staff_template',
      permissions: ['view_dashboard', 'view_attendance', 'admission.view', 'finance.view'],
    });

    expect(resolveAdminStaffWorkspace(user)).toBeNull();
  });

  it('does not select the workspace from broad permissions alone', () => {
    const user = staff({
      creation_template_code: null,
      permissions: [
        'view_dashboard',
        'view_students',
        'view_attendance',
        'view_teachers',
        'view_classes',
        'view_channels',
        'admission.view',
        'finance.view',
      ],
    });

    expect(resolveAdminStaffWorkspace(user)).toBeNull();
  });

  it('keeps only registration, collections, and student-file intervention codes', () => {
    const workspace = resolveAdminStaffWorkspace(
      staff({ creation_template_code: REGISTRATION_COLLECTIONS_TEMPLATE_CODE }),
    );
    expect(workspace).not.toBeNull();

    const items: AdminActionItem[] = [
      { id: 'families_overdue', label: 'Finance' },
      { id: 'admissions_overdue_actions', label: 'Admissions' },
      { id: 'dq-without-parent', label: 'Student file' },
      { id: 'teacher_without_assignments', label: 'Teachers' },
      { id: 'draft-results', label: 'Results' },
      { id: 'classes_missing_attendance_today', label: 'Attendance' },
      { id: 'unknown-server-alert', label: 'Unknown' },
    ];

    expect(filterAdminStaffWorkspaceActionItems(workspace!, items).map((item) => item.id)).toEqual([
      'families_overdue',
      'admissions_overdue_actions',
      'dq-without-parent',
    ]);
  });
});
