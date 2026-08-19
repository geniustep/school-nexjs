import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type { CurrentUser } from '@/types/user';

export const REGISTRATION_COLLECTIONS_TEMPLATE_CODE = 'registration_collections_officer';

const REGISTRATION_COLLECTIONS_ALERT_IDS = new Set([
  'overdue_followup_needed',
  'families_overdue',
  'finance-overdue',
  'finance-families-overdue',
  'finance-promises-due',
  'admissions_overdue_actions',
  'admissions-overdue',
  'admissions-new',
  'admissions-review',
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

export interface AdminStaffWorkspace {
  id: 'registration_collections';
  templateCode: typeof REGISTRATION_COLLECTIONS_TEMPLATE_CODE;
  primaryDomains: readonly ['registration', 'collections'];
  showAttendanceOperations: false;
  showAcademicActivity: false;
  showLatestMessages: true;
}

const REGISTRATION_COLLECTIONS_WORKSPACE: AdminStaffWorkspace = {
  id: 'registration_collections',
  templateCode: REGISTRATION_COLLECTIONS_TEMPLATE_CODE,
  primaryDomains: ['registration', 'collections'],
  showAttendanceOperations: false,
  showAcademicActivity: false,
  showLatestMessages: true,
};

/**
 * Resolves the primary operational workspace from the canonical template code returned by /me.
 * Display labels and permission breadth never select the workspace.
 */
export function resolveAdminStaffWorkspace(user: CurrentUser | null): AdminStaffWorkspace | null {
  if (!user || user.admin_kind !== 'admin_staff') return null;
  if (user.creation_template_code !== REGISTRATION_COLLECTIONS_TEMPLATE_CODE) return null;
  return REGISTRATION_COLLECTIONS_WORKSPACE;
}

/**
 * Keeps only stable registration/collections/data-quality alert codes for this workspace.
 * Unknown or unrelated alerts remain available to managers but are not promoted here.
 */
export function filterAdminStaffWorkspaceActionItems(
  workspace: AdminStaffWorkspace,
  items: AdminActionItem[],
): AdminActionItem[] {
  if (workspace.id !== 'registration_collections') return items;
  return items.filter((item) => REGISTRATION_COLLECTIONS_ALERT_IDS.has(item.id));
}
