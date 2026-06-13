import { hasPermission } from '@/lib/permissions/permissions';
import { canViewFinance } from '@/lib/permissions/finance';
import type { CurrentUser } from '@/types/user';
import type { StudentCapabilities } from '@/types/student-360';

export function resolveStudentCapabilities(
  apiCaps: StudentCapabilities | undefined,
  user: CurrentUser | null,
): StudentCapabilities {
  if (
    apiCaps &&
    (apiCaps.can_manage || apiCaps.can_manage_guardians || apiCaps.can_view_finance)
  ) {
    return apiCaps;
  }
  return {
    can_manage: hasPermission(user, 'manage_students'),
    can_manage_guardians:
      hasPermission(user, 'manage_parents') || hasPermission(user, 'manage_students'),
    can_view_finance: canViewFinance(user),
  };
}
