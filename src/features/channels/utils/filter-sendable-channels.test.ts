import { describe, expect, it } from 'vitest';
import type { Channel } from '@/types/channel';
import {
  adminCreateMessageHref,
  filterSendableChannels,
  parseComposeChannelId,
} from './filter-sendable-channels';

function channel(partial: Partial<Channel> & Pick<Channel, 'id' | 'name'>): Channel {
  return {
    type: 'teachers',
    description: null,
    audience: null,
    read_only: false,
    can_send: true,
    unread_count: 0,
    member_count: 1,
    last_message_date: null,
    ...partial,
  };
}

describe('filterSendableChannels', () => {
  it('keeps channels allowed by can_send and allowed_message_actions', () => {
    const rows = [
      channel({
        id: 1,
        name: 'Staff',
        can_send: true,
        allowed_message_actions: ['send_internal'],
      }),
      channel({
        id: 2,
        name: 'External',
        can_send: true,
        allowed_message_actions: ['submit_message'],
      }),
      channel({
        id: 3,
        name: 'Blocked',
        can_send: false,
        allowed_message_actions: ['send_internal'],
      }),
      channel({
        id: 4,
        name: 'Read only',
        can_send: true,
        read_only: true,
        allowed_message_actions: ['send_internal'],
      }),
      channel({
        id: 5,
        name: 'No compose action',
        can_send: true,
        allowed_message_actions: ['approve'],
      }),
    ];

    expect(filterSendableChannels(rows).map((c) => c.id)).toEqual([1, 2, 4]);
  });

  it('does not block solely because read_only when Backend can_send allows compose', () => {
    const rows = [
      channel({
        id: 4,
        name: 'Governed read_only flag',
        can_send: true,
        read_only: true,
        allowed_message_actions: ['submit_message'],
      }),
    ];
    expect(filterSendableChannels(rows).map((c) => c.id)).toEqual([4]);
  });

  it('keeps can_send=true when allowed_message_actions is omitted (compat)', () => {
    const rows = [channel({ id: 9, name: 'Legacy', can_send: true })];
    expect(filterSendableChannels(rows)).toHaveLength(1);
  });
});

describe('parseComposeChannelId', () => {
  it('parses a valid channelId', () => {
    expect(parseComposeChannelId(new URLSearchParams('channelId=42'))).toEqual({
      ok: true,
      channelId: 42,
    });
  });

  it('rejects missing, invalid, and conflicting values', () => {
    expect(parseComposeChannelId(new URLSearchParams(''))).toEqual({
      ok: false,
      reason: 'missing',
    });
    expect(parseComposeChannelId(new URLSearchParams('channelId=0'))).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(
      parseComposeChannelId(new URLSearchParams('channelId=1&channelId=2')),
    ).toEqual({ ok: false, reason: 'conflicting' });
  });
});

describe('adminCreateMessageHref', () => {
  it('builds compose href with optional channelId', () => {
    expect(adminCreateMessageHref()).toBe('/admin/channels/compose');
    expect(adminCreateMessageHref(7)).toBe('/admin/channels/compose?channelId=7');
  });
});
