import type { ActiveUserContext, CurrentUser, UserRoleContext } from '@/types/user';

export function contextKey(context: Pick<ActiveUserContext, 'school_id' | 'role'>): string {
  return `${context.school_id}:${context.role}`;
}

export function listAvailableContexts(
  user: Pick<CurrentUser, 'available_contexts'> | null | undefined,
): UserRoleContext[] {
  return Array.isArray(user?.available_contexts) ? user.available_contexts : [];
}

export function hasContextContract(
  user: Pick<CurrentUser, 'available_contexts'> | null | undefined,
): boolean {
  return Array.isArray(user?.available_contexts);
}

export function shouldShowContextSwitcher(
  user: Pick<CurrentUser, 'available_contexts'> | null | undefined,
): boolean {
  return listAvailableContexts(user).length > 1;
}

export function contextIsAvailable(
  user: Pick<CurrentUser, 'available_contexts'> | null | undefined,
  requested: ActiveUserContext,
): boolean {
  return listAvailableContexts(user).some((ctx) => contextKey(ctx) === contextKey(requested));
}

export function confirmedActiveContext(
  user: Pick<CurrentUser, 'active_context'> | null | undefined,
): ActiveUserContext | null {
  return user?.active_context ?? null;
}
