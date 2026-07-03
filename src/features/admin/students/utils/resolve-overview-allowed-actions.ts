import type { StudentCapabilities } from '@/types/student-360';
import type { StudentOverviewAllowedActions, StudentOverviewData } from '@/types/student-overview';
import { canArchiveStudents } from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';

function isAllowed(actions: StudentOverviewAllowedActions | undefined, key: string): boolean | undefined {
  if (!actions || !(key in actions)) return undefined;
  return actions[key] === true;
}

export function resolveOverviewEditAllowed(
  overview: StudentOverviewData | null | undefined,
  caps: StudentCapabilities,
): boolean {
  const allowed = isAllowed(overview?.allowed_actions, 'edit_student');
  if (allowed === false) return false;
  return caps.can_manage;
}

export function resolveOverviewArchiveAllowed(
  overview: StudentOverviewData | null | undefined,
  caps: StudentCapabilities,
  user?: CurrentUser | null,
): boolean {
  const allowed = isAllowed(overview?.allowed_actions, 'archive_student');
  if (allowed === false) return false;
  if (user) return canArchiveStudents(user);
  return caps.can_manage;
}

export function resolveOverviewManageGuardiansAllowed(
  overview: StudentOverviewData | null | undefined,
  caps: StudentCapabilities,
): boolean {
  const allowed = isAllowed(overview?.allowed_actions, 'manage_guardians');
  if (allowed === false) return false;
  return caps.can_manage_guardians;
}
