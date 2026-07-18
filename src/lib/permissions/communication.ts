import type { CurrentUser } from '@/types/user';
import { hasPermission } from '@/lib/permissions/permissions';

export const COMMUNICATION_CAPABILITIES = {
  view: 'communication.content.view',
  create: 'communication.content.create',
  submit: 'communication.content.submit',
  review: 'communication.content.review',
  approve: 'communication.content.approve',
  publish: 'communication.content.publish',
  schedule: 'communication.content.schedule',
  cancel: 'communication.content.cancel',
  audit: 'communication.audit.view',
} as const;

function caps(user: CurrentUser | null | undefined): string[] {
  if (!user) return [];
  const fromEffective = Array.isArray(user.effective_capabilities)
    ? user.effective_capabilities
    : [];
  const fromPermissions = Array.isArray(user.permissions) ? user.permissions.map(String) : [];
  return [...new Set([...fromEffective, ...fromPermissions])];
}

export function hasCommunicationCapability(
  user: CurrentUser | null | undefined,
  code: string,
): boolean {
  return caps(user).includes(code);
}

export function canViewCommunicationWorkspace(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.view)) return true;
  if (hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.review)) return true;
  // Legacy surface still used for channel list access.
  return hasPermission(user, 'view_channels');
}

export function canReviewCommunication(user: CurrentUser | null | undefined): boolean {
  return (
    hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.review) ||
    hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.approve)
  );
}
