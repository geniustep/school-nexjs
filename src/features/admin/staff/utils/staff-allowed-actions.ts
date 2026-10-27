import type { StaffAllowedAction, StaffMember } from '@/types/academic-setup';

export function normalizeStaffAllowedActions(
  raw: StaffAllowedAction[] | Record<string, boolean> | undefined | null,
): StaffAllowedAction[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((action): action is StaffAllowedAction => typeof action === 'string');
  }
  return (Object.entries(raw) as [StaffAllowedAction, boolean][])
    .filter(([, allowed]) => allowed)
    .map(([action]) => action);
}

export function hasStaffAllowedAction(
  actions: StaffAllowedAction[] | Record<string, boolean> | undefined | null,
  key: StaffAllowedAction | string,
): boolean {
  return normalizeStaffAllowedActions(actions).includes(key as StaffAllowedAction);
}

export function staffAllowedActionsForDisplay(
  member: Pick<StaffMember, 'allowed_actions'>,
): StaffAllowedAction[] {
  return normalizeStaffAllowedActions(member.allowed_actions);
}

/** Navigation targets are UI-only; authorization remains owned by School API. */
export function staffActionNavigationHref(
  action: StaffAllowedAction,
  userId: number,
  adminKind?: StaffMember['admin_kind'],
): string | null {
  if (action === 'view_effective_permissions') return '#staff-effective-permissions';
  if (action === 'edit') return `/admin/staff/${userId}/edit`;
  if (action === 'manage_permissions') {
    return adminKind === 'general_supervisor'
      ? `/admin/staff/${userId}/edit#staff-responsibilities`
      : `/admin/staff/${userId}/edit#staff-permissions`;
  }
  if (action === 'manage_scopes') return `/admin/staff/${userId}/edit#staff-responsibilities`;
  return null;
}
