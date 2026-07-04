// Admin dashboard registry — variant + widget composition from CurrentUser only.
// Does not change API contracts; uses existing permission helpers.

import {
  canAccessScopedAdminDashboard,
  isMultiSchoolAdmin,
  shouldHideSchoolWideDashboardKpis,
  shouldShowMultiSchoolPortfolioNotice,
} from '@/lib/admin/admin-ux';
import { isExecutiveDirectorVariantId } from '@/lib/admin/executive-dashboard';
import { shouldUsePedagogicalDashboard } from '@/lib/admin/pedagogical-dashboard';
import { canAccessStaffCenter } from '@/lib/permissions/academic-setup';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import { canViewAcademicSetup, canViewSettings } from '@/lib/permissions/academic-setup';
import { canViewFinance } from '@/lib/permissions/finance';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
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
  | 'pedagogical_director'
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
  executiveLayout: boolean;
  financeSummary: boolean;
  admissionsSummary: boolean;
  staffSummary: boolean;
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

export type AdminDashboardPermissionAreaId =
  | 'students'
  | 'enrollments'
  | 'attendance'
  | 'messages'
  | 'finance'
  | 'settings';

export interface AdminDashboardPermissionArea {
  id: AdminDashboardPermissionAreaId;
  allowed: boolean;
}

export interface AdminDashboardContextPresentation {
  variantLabelKey: string;
  headlineKey: string;
  mode: 'full' | 'limited';
  hiddenReasonKey: string | null;
  permissionAreas: AdminDashboardPermissionArea[];
}

const VARIANT_LABEL_KEYS: Record<Exclude<AdminDashboardVariantId, 'denied'>, string> = {
  project_manager: 'admin.dashboardContext.variantProjectManager',
  school_manager: 'admin.dashboardContext.variantSchoolManager',
  general_supervisor_scoped: 'admin.dashboardContext.variantGeneralSupervisor',
  admin_staff: 'admin.dashboardContext.variantAdminStaff',
  legacy_admin: 'admin.dashboardContext.variantLegacyAdmin',
  scoped_admin: 'admin.dashboardContext.variantScopedAdmin',
  pedagogical_director: 'admin.dashboardContext.variantPedagogicalDirector',
};

const PERMISSION_AREA_LABEL_KEYS: Record<AdminDashboardPermissionAreaId, string> = {
  students: 'admin.dashboardContext.permStudents',
  enrollments: 'admin.dashboardContext.permEnrollments',
  attendance: 'admin.dashboardContext.permAttendance',
  messages: 'admin.dashboardContext.permMessages',
  finance: 'admin.dashboardContext.permFinance',
  settings: 'admin.dashboardContext.permSettings',
};

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
    case 'pedagogical_director':
      return 'pedagogical_director';
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
  const pedagogicalDashboard = shouldUsePedagogicalDashboard(user);
  const shell: AdminDashboardShell = pedagogicalDashboard
    ? 'readonly'
    : fullDashboard
      ? 'command'
      : 'readonly';

  return {
    id: resolveVariantId(user, shell),
    shell,
    canAccess: true,
    scopedMode: pedagogicalDashboard ? false : scopedMode,
    hideSchoolWideKpis: pedagogicalDashboard ? false : hideSchoolWideKpis,
    showMultiSchoolPortfolioNotice: shouldShowMultiSchoolPortfolioNotice(user),
    showActiveSchoolBanner: multiSchool,
    showScopedAccessBanner: pedagogicalDashboard ? false : scopedMode,
    fetchFullDashboardApi: fullDashboard && !pedagogicalDashboard,
  };
}

/** Active-school banner is redundant on the executive dashboard (school is in hero + header). */
export function shouldShowActiveSchoolBannerOnDashboard(user: CurrentUser | null): boolean {
  const variant = resolveDashboardVariant(user);
  const widgets = resolveDashboardWidgets(user);
  return variant.showActiveSchoolBanner && !widgets.executiveLayout;
}

/** Resolves command-dashboard widget visibility from permissions, scope, and admin_kind. */
export function resolveDashboardWidgets(user: CurrentUser | null): AdminDashboardWidgets {
  if (!user) {
    return {
      executiveLayout: false,
      financeSummary: false,
      admissionsSummary: false,
      staffSummary: false,
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

  const variant = resolveDashboardVariant(user);
  const executiveLayout =
    variant.shell === 'command' && isExecutiveDirectorVariantId(variant.id);
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
    !hideSchoolWideKpis &&
    !executiveLayout;

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
    executiveLayout,
    financeSummary: executiveLayout && canViewFinance(user),
    admissionsSummary: executiveLayout && hasPermission(user, ADMISSION_VIEW),
    staffSummary:
      executiveLayout &&
      (canAccessStaffCenter(user) ||
        hasPermission(user, 'view_teachers') ||
        canViewSettings(user)),
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
    latestMessages: canViewChannels && !executiveLayout,
    quickActions,
  };
}

function resolveDashboardHeadlineKey(variant: AdminDashboardVariant): string {
  if (variant.id === 'pedagogical_director') {
    return 'admin.pedagogicalDashboard.title';
  }
  if (isExecutiveDirectorVariantId(variant.id)) {
    return 'admin.executive.contextHeadline';
  }
  if (variant.id === 'admin_staff') {
    return 'admin.dashboardContext.headlineAdminStaff';
  }
  if (variant.hideSchoolWideKpis || variant.scopedMode) {
    return 'admin.dashboardContext.headlineScoped';
  }
  return 'admin.dashboardContext.headlineFull';
}

function resolveDashboardHiddenReasonKey(
  variant: AdminDashboardVariant,
  permissionAreas: AdminDashboardPermissionArea[],
): string | null {
  const scopedHidden = variant.hideSchoolWideKpis || variant.scopedMode;
  const permissionGaps = permissionAreas.some((area) => !area.allowed);

  if (scopedHidden && permissionGaps) {
    return 'admin.dashboardContext.hiddenReasonBoth';
  }
  if (scopedHidden) {
    return 'admin.dashboardContext.hiddenReasonScoped';
  }
  if (permissionGaps) {
    return 'admin.dashboardContext.hiddenReasonPermissions';
  }
  return null;
}

function resolveDashboardPermissionAreas(
  user: CurrentUser,
  widgets: AdminDashboardWidgets,
): AdminDashboardPermissionArea[] {
  return [
    {
      id: 'students',
      allowed: widgets.dataQuality || widgets.schoolStructureStudents,
    },
    {
      id: 'enrollments',
      allowed: hasPermission(user, ADMISSION_VIEW),
    },
    {
      id: 'attendance',
      allowed: widgets.heroAttendance,
    },
    {
      id: 'messages',
      allowed: widgets.latestMessages,
    },
    {
      id: 'finance',
      allowed: canViewFinance(user),
    },
    {
      id: 'settings',
      allowed: canViewSettings(user) || canViewSchoolBrandingSettings(user),
    },
  ];
}

/** Role-aware dashboard context copy + permission summary for the context panel. */
export function resolveDashboardContextPresentation(
  user: CurrentUser | null,
): AdminDashboardContextPresentation | null {
  if (shouldUsePedagogicalDashboard(user)) {
    return null;
  }

  const variant = resolveDashboardVariant(user);
  if (!user || !variant.canAccess) {
    return null;
  }

  const widgets = resolveDashboardWidgets(user);
  const permissionAreas = resolveDashboardPermissionAreas(user, widgets);
  const mode: 'full' | 'limited' =
    variant.shell === 'readonly' || variant.hideSchoolWideKpis || variant.id === 'admin_staff'
      ? 'limited'
      : 'full';

  return {
    variantLabelKey: VARIANT_LABEL_KEYS[variant.id as Exclude<AdminDashboardVariantId, 'denied'>],
    headlineKey: resolveDashboardHeadlineKey(variant),
    mode,
    hiddenReasonKey: resolveDashboardHiddenReasonKey(variant, permissionAreas),
    permissionAreas,
  };
}

export function dashboardPermissionAreaLabelKey(
  id: AdminDashboardPermissionAreaId,
): string {
  return PERMISSION_AREA_LABEL_KEYS[id];
}
