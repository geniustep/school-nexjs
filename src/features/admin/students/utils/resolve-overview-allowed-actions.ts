import type { StudentCapabilities } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';
import { canArchiveStudents } from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';

export type StudentOverviewEditAccess = 'pending' | 'allowed' | 'denied' | 'unavailable';

export function resolveOverviewEditAccess(
  overview: StudentOverviewData | null | undefined,
  state: {
    loading: boolean;
    hasError: boolean;
    endpointUnavailable: boolean;
  },
): StudentOverviewEditAccess {
  if (state.loading) return 'pending';
  if (state.hasError || state.endpointUnavailable) return 'unavailable';
  if (!overview) return 'pending';
  if (!overview.allowed_actions) return 'unavailable';

  return overview.allowed_actions.includes('edit') ? 'allowed' : 'denied';
}

export function resolveOverviewEditAllowed(
  overview: StudentOverviewData | null | undefined,
  _caps: StudentCapabilities,
): boolean {
  return overview?.allowed_actions?.includes('edit') === true;
}

export function resolveOverviewArchiveAllowed(
  _overview: StudentOverviewData | null | undefined,
  caps: StudentCapabilities,
  user?: CurrentUser | null,
): boolean {
  if (user) return canArchiveStudents(user);
  return caps.can_manage;
}

export function resolveOverviewManageGuardiansAllowed(
  _overview: StudentOverviewData | null | undefined,
  caps: StudentCapabilities,
): boolean {
  return caps.can_manage_guardians;
}
