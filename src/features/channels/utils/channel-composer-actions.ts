import type { Channel } from '@/types/channel';
import type { ChannelMessageAction } from '@/types/communication';

/** Whether the composer may submit based on Backend channel flags + actions. */
export function channelAllowsCompose(channel: Pick<
  Channel,
  'can_send' | 'read_only' | 'allowed_message_actions'
>): boolean {
  // Do not derive authority from read_only alone — Backend can_send + actions win.
  if (channel.can_send === false) return false;
  if (channel.can_send !== true) return false;
  const actions = channel.allowed_message_actions;
  if (!actions || actions.length === 0) {
    // Backward compatible when Backend omits the field.
    return true;
  }
  return actions.some(
    (a) => a === 'send_internal' || a === 'submit_message' || a === 'send' || a === 'submit',
  );
}

export function channelComposeMode(
  channel: Pick<Channel, 'allowed_message_actions' | 'requires_message_moderation' | 'is_internal_staff_only'>,
): 'internal' | 'submit' | 'unknown' {
  const actions = channel.allowed_message_actions ?? [];
  if (actions.includes('send_internal')) return 'internal';
  if (actions.includes('submit_message')) return 'submit';
  if (channel.is_internal_staff_only && !channel.requires_message_moderation) return 'internal';
  if (channel.requires_message_moderation) return 'submit';
  return 'unknown';
}

export function hasChannelMessageAction(
  channel: Pick<Channel, 'allowed_message_actions'>,
  action: ChannelMessageAction,
): boolean {
  return (channel.allowed_message_actions ?? []).includes(action);
}
