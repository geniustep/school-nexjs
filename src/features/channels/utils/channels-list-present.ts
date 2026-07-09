/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { Channel, ChannelType } from '@/types/channel';

/** Admin/portal list fetches up to this many channels; no pagination UI. */
export const CHANNELS_LIST_PAGE_SIZE = 100;

export type ChannelAccessPresentation = 'read-only' | 'view-only' | null;

export function resolveChannelAccessPresentation(channel: Pick<
  Channel,
  'read_only' | 'can_send'
>): ChannelAccessPresentation {
  if (channel.read_only) return 'read-only';
  if (!channel.can_send) return 'view-only';
  return null;
}

export function channelTypeAccentClass(type: ChannelType | string): string {
  return `channel-card--${type}`;
}

export function formatChannelMemberCount(
  count: number,
  singular: string,
  plural: string,
): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return `${safe} ${safe === 1 ? singular : plural}`;
}

export function channelHasUnread(channel: Pick<Channel, 'unread_count'>): boolean {
  return (channel.unread_count ?? 0) > 0;
}
