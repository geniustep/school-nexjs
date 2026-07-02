// Admin dashboard registry — variant + widget composition from CurrentUser only.
// Does not change API contracts; uses existing permission helpers.

import {
  canAccessScopedAdminDashboard,
  isMultiSchoolAdmin,
  shouldHideSchoolWideDashboardKpis,
  shouldShowMultiSchoolPortfolioNotice,
} from '@/lib/admin/admin-ux';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
import { hasPermission } from '@/lib/permissions/permissions';
import { canSeeChannels, canSeeStudentData, isConfiguredAdmin, isScopedAdmin } from '@/lib/permissions/scope';
import type { CurrentUser } from '@/types/user';

export type AdminDashboardVariantId =
  | 'project_manager'
  | 'school_manager'
  | 'general_supervisor_scoped'
  | 'admin_staff'
  | 'legacy_admin'
  | 'scoped_admin'
  | 'denied';

export type AdminDashboardShell = 'command' | 'readonly' | 'denied';

export interface AdminDashboardVariant {
  id: AdminDashboardVariantId;
  shell: AdminDashboardShell;
  canAccess: boolean;
  scopedMode: boolean;
  hideSchoolWideKpis: boolean;
  showMultiSchoolPortfolioNotice: boolean;
  showActiveSchoolBanner: boolean;
  showScopedAccessBanner: boolean;
  fetchFullDashboardApi: boolean;
}

export type AdminQuickActionId =
  | 'add-student'
  | 'attendance'
  | 'classes'
  | 'import-csv'
  | 'channels'
  | 'settings';

export interface AdminDashboardWidgets {
  heroAttendance: boolean;
  heroCorrectAttendance: boolean;
  attendanceOperations: boolean;
  intervention: boolean;
  dataQuality: boolean;
  schoolStructure: boolean;
  schoolStructureStudents: boolean;
  schoolStructureTeachers: boolean;
  schoolStructureParents: boolean;
  schoolStructureClasses: boolean;
  academicActivity: boolean;
  latestMessages: boolean;
  quickActions: AdminQuickActionId[];
}

const DENIED_VARIANT: AdminDashboardVariant = {
  id: 'denied',
  shell: 'denied',
  canAccess: false,
  scopedMode: false,
  hideSchoolWideKpis: false,
  showMultiSchoolPortfolioNotice: false,
  showActiveSchoolBanner: false,
  showScopedAccessBanner: false,
  fetchFullDashboardApi: false,
};

function resolveScopedMode(user: CurrentUser): boolean {
  return isScopedAdmin(user) || user.admin_kind === 'general_supervisor';
}

function resolveVariantId(user: CurrentUser, shell: AdminDashboardShell): AdminDashboardVariantId {
  if (shell === 'denied') return 'denied';

  switch (user.admin_kind) {
    case 'project_manager':
    case 'super_admin':
      return 'project_manager';
    case 'school_manager':
      return 'school_manager';
    case 'general_supervisor':
      return 'general_supervisor_scoped';
    case 'admin_staff':
      return 'admin_staff';
    case 'legacy_admin':
      return 'legacy_admin';
    default:
      return resolveScopedMode(user) ? 'scoped_admin' : 'school_manager';
  }
}

/** Selects the admin dashboard shell and contextual banners for the signed-in user. */
export function resolveDashboardVariant(user: CurrentUser | null): AdminDashboardVariant {
  if (!user || !isConfiguredAdmin(user)) {
    return DENIED_VARIANT;
  }

  const fullDashboard = hasPermission(user, 'view_dashboard');
  const scopedDashboard = canAccessScopedAdminDashboard(user);

  if (!fullDashboard && !scopedDashboard) {
    return DENIED_VARIANT;
  }

  const scopedMode = resolveScopedMode(user);
  const hideSchoolWideKpis = shouldHideSchoolWideDashboardKpis(user);
  const multiSchool = isMultiSchoolAdmin(user);
  const shell: AdminDashboardShell = fullDashboard ? 'command' : 'readonly';

  return {
    id: resolveVariantId(user, shell),
    shell,
    canAccess: true,
    scopedMode,
    hideSchoolWideKpis,
    showMultiSchoolPortfolioNotice: shouldShowMultiSchoolPortfolioNotice(user),
    showActiveSchoolBanner: multiSchool,
    showScopedAccessBanner: scopedMode,
    fetchFullDashboardApi: fullDashboard,
  };
}

/** Resolves command-dashboard widget visibility from permissions, scope, and admin_kind. */
export function resolveDashboardWidgets(user: CurrentUser | null): AdminDashboardWidgets {
  if (!user) {
    return {
      heroAttendance: false,
      heroCorrectAttendance: false,
      attendanceOperations: false,
      intervention: true,
      dataQuality: false,
      schoolStructure: false,
      schoolStructureStudents: false,
      schoolStructureTeachers: false,
      schoolStructureParents: false,
      schoolStructureClasses: false,
      academicActivity: false,
      latestMessages: false,
      quickActions: [],
    };
  }

  const hideSchoolWideKpis = shouldHideSchoolWideDashboardKpis(user);
  const canViewAttendance =
    canSeeStudentData(user) && hasPermission(user, 'view_attendance');
  const canCorrectAttendance =
    canSeeStudentData(user) && hasPermission(user, 'manage_attendance');
  const canViewChannels =
    canSeeChannels(user) && hasPermission(user, 'view_channels');
  const canOpenStudents =
    canSeeStudentData(user) && hasPermission(user, 'view_students');

  const schoolStructureStudents = hasPermission(user, 'view_students');
  const schoolStructureTeachers = hasPermission(user, 'view_teachers');
  const schoolStructureParents = hasPermission(user, 'view_parents');
  const schoolStructureClasses = hasPermission(user, 'view_classes');

  const schoolStructure =
    canSeeStudentData(user) &&
    !hideSchoolWideKpis &&
    (schoolStructureStudents ||
      schoolStructureTeachers ||
      schoolStructureParents ||
      schoolStructureClasses);

  const academicActivity =
    hasPermission(user, 'view_classes') &&
    canSeeStudentData(user) &&
    !hideSchoolWideKpis;

  const quickActions: AdminQuickActionId[] = [];
  if (hasPermission(user, 'manage_students') && hasPermission(user, 'view_students')) {
    quickActions.push('add-student');
  }
  if (canViewAttendance) quickActions.push('attendance');
  if (hasPermission(user, 'view_classes')) quickActions.push('classes');
  if (hasPermission(user, 'import_data')) quickActions.push('import-csv');
  if (canViewChannels) quickActions.push('channels');
  if (canViewAcademicSetup(user)) quickActions.push('settings');

  return {
    heroAttendance: canViewAttendance,
    heroCorrectAttendance: canCorrectAttendance,
    attendanceOperations: canViewAttendance,
    intervention: true,
    dataQuality: canOpenStudents,
    schoolStructure,
    schoolStructureStudents,
    schoolStructureTeachers,
    schoolStructureParents,
    schoolStructureClasses,
    academicActivity,
    latestMessages: canViewChannels,
    quickActions,
  };
}
