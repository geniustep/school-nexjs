import type { CurrentUser } from '@/types/user';

export const EDGE_DEVICE_MANAGE_CAPABILITY = 'edge.device.manage';

function hasCapability(user: CurrentUser | null, code: string): boolean {
  if (!user) return false;
  if (user.effective_capabilities?.includes(code)) return true;
  if ((user.permissions as readonly string[] | undefined)?.includes(code)) return true;
  return (user.effective_permissions as readonly string[] | undefined)?.includes(code) ?? false;
}

export function canManageEdgeSettings(user: CurrentUser | null): boolean {
  return !!user && user.role === 'admin' && hasCapability(user, EDGE_DEVICE_MANAGE_CAPABILITY);
}

export const canViewEdgeSettings = canManageEdgeSettings;
