import type { Channel } from '@/types/channel';
import { channelAllowsCompose } from './channel-composer-actions';

/** Channels the Backend allows the current user to compose into. */
export function filterSendableChannels(channels: readonly Channel[]): Channel[] {
  return channels.filter((channel) => channelAllowsCompose(channel));
}

export type ParseComposeChannelIdResult =
  | { ok: true; channelId: number }
  | { ok: false; reason: 'missing' | 'invalid' | 'conflicting' };

/**
 * Optional deep-link: /admin/channels/compose?channelId=<id>
 * Only the canonical frontend key `channelId` is accepted.
 */
export function parseComposeChannelId(
  params: Pick<URLSearchParams, 'get' | 'getAll'>,
): ParseComposeChannelIdResult {
  const all = params.getAll('channelId');
  if (all.length === 0) return { ok: false, reason: 'missing' };

  if (all.length > 1) {
    const unique = new Set(all.map((v) => v.trim()));
    if (unique.size > 1) return { ok: false, reason: 'conflicting' };
  }

  const raw = all[0].trim();
  if (!raw) return { ok: false, reason: 'missing' };
  if (!/^[1-9]\d*$/.test(raw)) return { ok: false, reason: 'invalid' };

  const channelId = Number(raw);
  if (!Number.isSafeInteger(channelId) || channelId <= 0) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, channelId };
}

export function adminCreateMessageHref(channelId?: number): string {
  if (channelId != null && Number.isSafeInteger(channelId) && channelId > 0) {
    return `/admin/channels/compose?channelId=${channelId}`;
  }
  return '/admin/channels/compose';
}
