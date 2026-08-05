/**
 * Literal allowed_actions helpers — no business rules beyond Backend booleans.
 */

import type {
  AdminChannelAllowedActions,
  AdminChannelListAllowedActions,
  AdminChannelLifecycleAction,
  AdminCreatableChannelType,
} from '@/types/admin-channel';
import {
  ADMIN_MANUAL_CHANNEL_TYPES,
  ADMIN_SYSTEM_CHANNEL_TYPES,
} from '@/types/admin-channel';

export function channelAllows(
  actions: AdminChannelAllowedActions | null | undefined,
  action: AdminChannelLifecycleAction,
): boolean {
  return actions?.[action] === true;
}

export function canCreateAdminChannel(
  metaActions: AdminChannelListAllowedActions | null | undefined,
): boolean {
  return metaActions?.create_channel === true;
}

export function channelNeedsClassId(channelType: string | null | undefined): boolean {
  if (!channelType) return false;
  return (
    channelType === 'class' ||
    (ADMIN_SYSTEM_CHANNEL_TYPES as readonly string[]).includes(channelType)
  );
}

export function isSystemChannelType(channelType: string | null | undefined): boolean {
  if (!channelType) return false;
  return (ADMIN_SYSTEM_CHANNEL_TYPES as readonly string[]).includes(channelType);
}

export function isCreatableChannelType(value: string): value is AdminCreatableChannelType {
  return (
    (ADMIN_MANUAL_CHANNEL_TYPES as readonly string[]).includes(value) ||
    (ADMIN_SYSTEM_CHANNEL_TYPES as readonly string[]).includes(value)
  );
}

export function resolveChannelType(
  channel: { channel_type?: string | null; type?: string | null },
): string {
  return String(channel.channel_type || channel.type || '');
}
