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
