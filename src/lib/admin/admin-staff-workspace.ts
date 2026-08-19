import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type { CurrentUser } from '@/types/user';

export const REGISTRATION_COLLECTIONS_TEMPLATE_CODE = 'registration_collections_officer';

const FINANCE_ALERT_IDS = new Set([
  'overdue_followup_needed',
  'families_overdue',
  'finance-overdue',
  'finance-families-overdue',
  'finance-promises-due',
]);

const ADMISSIONS_ALERT_IDS = new Set([
  'admissions_overdue_actions',
  'admissions-overdue',
  'admissions-new',
  'admissions-review',
]);

const ATTENDANCE_ALERT_IDS = new Set([
  'classes_missing_attendance_today',
  'attendance-classes-missing',
]);

const STUDENT_ALERT_IDS = new Set([
  'students_missing_guardian',
  'students_missing_required_data',
  'students_missing_massar',
  'dq-missing-guardian',
  'dq-missing-required',
  'dq-missing-massar',
  'dq-without-class',
  'dq-without-parent',
  'dq-without-year',
  'dq-incomplete-profile',
]);

const STAFF_ALERT_IDS = new Set(['teacher_without_assignments']);

export interface AdminStaffWorkspace {
  id: 'registration_collections';
  templateCode: typeof REGISTRATION_COLLECTIONS_TEMPLATE_CODE;
  primaryDomains: readonly ['registration', 'collections', 'communication'];
  showAttendanceOperations: true;
  showAcademicActivity: false;
  showLatestMessages: true;
  showOperationalStaffAlerts: true;
}

export interface AdminStaffWorkspaceAlertAccess {
  finance: boolean;
  admissions: boolean;
  attendance: boolean;
  students: boolean;
  staff: boolean;
}

const REGISTRATION_COLLECTIONS_WORKSPACE: AdminStaffWorkspace = {
  id: 'registration_collections',
  templateCode: REGISTRATION_COLLECTIONS_TEMPLATE_CODE,
  primaryDomains: ['registration', 'collections', 'communication'],
  showAttendanceOperations: true,
  showAcademicActivity: false,
  showLatestMessages: true,
  showOperationalStaffAlerts: true,
};

/**
 * Resolves the permanent operational workspace from the canonical template code returned by /me.
 * Display labels and permission breadth never select the workspace.
 */
export function resolveAdminStaffWorkspace(user: CurrentUser | null): AdminStaffWorkspace | null {
  if (!user || user.admin_kind !== 'admin_staff') return null;
  if (user.creation_template_code !== REGISTRATION_COLLECTIONS_TEMPLATE_CODE) return null;
  return REGISTRATION_COLLECTIONS_WORKSPACE;
}

function isAllowedWorkspaceAlert(id: string, access: AdminStaffWorkspaceAlertAccess): boolean {
  if (FINANCE_ALERT_IDS.has(id)) return access.finance;
  if (ADMISSIONS_ALERT_IDS.has(id)) return access.admissions;
  if (ATTENDANCE_ALERT_IDS.has(id)) return access.attendance;
  if (STUDENT_ALERT_IDS.has(id)) return access.students;
  if (STAFF_ALERT_IDS.has(id)) return access.staff;
  return false;
}

/**
 * Promotes only stable registration, collections, communication-adjacent data quality,
 * and delegated assistant-to-director operational alerts. Permission access still gates
 * every family, so responsibility never widens backend authorization.
 */
export function filterAdminStaffWorkspaceActionItems(
  workspace: AdminStaffWorkspace,
  items: AdminActionItem[],
  access: AdminStaffWorkspaceAlertAccess,
): AdminActionItem[] {
  if (workspace.id !== 'registration_collections') return [];
  return items.filter((item) => isAllowedWorkspaceAlert(item.id, access));
}
