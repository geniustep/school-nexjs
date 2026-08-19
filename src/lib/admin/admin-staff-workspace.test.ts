import { describe, expect, it } from 'vitest';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import {
  filterAdminStaffWorkspaceActionItems,
  REGISTRATION_COLLECTIONS_TEMPLATE_CODE,
  resolveAdminStaffWorkspace,
  type AdminStaffWorkspaceAlertAccess,
} from '@/lib/admin/admin-staff-workspace';
import type { CurrentUser } from '@/types/user';

function staff(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Administrative staff',
    email: 'staff@test.ma',
    role: 'admin',
    admin_kind: 'admin_staff',
    permissions: ['view_dashboard'],
    school: { id: 3, name: 'School' },
    ...overrides,
  };
}

const allOperationalAccess: AdminStaffWorkspaceAlertAccess = {
  finance: true,
  admissions: true,
  attendance: true,
  students: true,
  staff: true,
};

describe('admin staff operational workspace', () => {
  it('resolves the permanent assistant workspace from the canonical creation template code', () => {
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
    expect(workspace?.primaryDomains).toEqual(['registration', 'collections', 'communication']);
    expect(workspace?.showAttendanceOperations).toBe(true);
    expect(workspace?.showAcademicActivity).toBe(false);
    expect(workspace?.showLatestMessages).toBe(true);
    expect(workspace?.showOperationalStaffAlerts).toBe(true);
  });

  it('does not infer responsibility from a localized display label', () => {
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

  it('keeps registration, collections and delegated operational alerts but excludes academic results', () => {
    const workspace = resolveAdminStaffWorkspace(
      staff({ creation_template_code: REGISTRATION_COLLECTIONS_TEMPLATE_CODE }),
    );
    expect(workspace).not.toBeNull();

    const items: AdminActionItem[] = [
      { id: 'families_overdue', label: 'Finance' },
      { id: 'admissions_overdue_actions', label: 'Admissions' },
      { id: 'dq-without-parent', label: 'Student file' },
      { id: 'teacher_without_assignments', label: 'Teachers' },
      { id: 'classes_missing_attendance_today', label: 'Attendance' },
      { id: 'draft-results', label: 'Results' },
      { id: 'exams-missing-results', label: 'Exams' },
      { id: 'unknown-server-alert', label: 'Unknown' },
    ];

    expect(
      filterAdminStaffWorkspaceActionItems(workspace!, items, allOperationalAccess).map(
        (item) => item.id,
      ),
    ).toEqual([
      'families_overdue',
      'admissions_overdue_actions',
      'dq-without-parent',
      'teacher_without_assignments',
      'classes_missing_attendance_today',
    ]);
  });

  it('does not surface delegated operational alerts when their effective access is absent', () => {
    const workspace = resolveAdminStaffWorkspace(
      staff({ creation_template_code: REGISTRATION_COLLECTIONS_TEMPLATE_CODE }),
    );
    expect(workspace).not.toBeNull();

    const items: AdminActionItem[] = [
      { id: 'families_overdue', label: 'Finance' },
      { id: 'admissions-overdue', label: 'Admissions' },
      { id: 'dq-without-parent', label: 'Student file' },
      { id: 'teacher_without_assignments', label: 'Teachers' },
      { id: 'attendance-classes-missing', label: 'Attendance' },
    ];

    const access: AdminStaffWorkspaceAlertAccess = {
      finance: true,
      admissions: true,
      attendance: false,
      students: true,
      staff: false,
    };

    expect(
      filterAdminStaffWorkspaceActionItems(workspace!, items, access).map((item) => item.id),
    ).toEqual(['families_overdue', 'admissions-overdue', 'dq-without-parent']);
  });
});
