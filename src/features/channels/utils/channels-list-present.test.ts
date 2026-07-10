/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { describe, expect, it } from 'vitest';
import {
  CHANNELS_LIST_PAGE_SIZE,
  channelHasUnread,
  channelTypeAccentClass,
  formatChannelMemberCount,
  resolveChannelAccessPresentation,
} from '@/features/channels/utils/channels-list-present';

describe('channels-list-present', () => {
  it('documents page_size 100 without pagination UI', () => {
    expect(CHANNELS_LIST_PAGE_SIZE).toBe(100);
  });

  it('resolves access badges without inventing membership semantics', () => {
    expect(resolveChannelAccessPresentation({ read_only: true, can_send: false })).toBe(
      'read-only',
    );
    expect(resolveChannelAccessPresentation({ read_only: true, can_send: true })).toBe(
      'read-only',
    );
    expect(resolveChannelAccessPresentation({ read_only: false, can_send: false })).toBe(
      'view-only',
    );
    expect(resolveChannelAccessPresentation({ read_only: false, can_send: true })).toBe(null);
  });

  it('maps type to existing accent class', () => {
    expect(channelTypeAccentClass('class')).toBe('channel-card--class');
    expect(channelTypeAccentClass('announcement')).toBe('channel-card--announcement');
  });

  it('formats member counts', () => {
    expect(formatChannelMemberCount(1, 'member', 'members')).toBe('1 member');
    expect(formatChannelMemberCount(3, 'member', 'members')).toBe('3 members');
    expect(formatChannelMemberCount(-2, 'member', 'members')).toBe('0 members');
  });

  it('detects unread badge visibility', () => {
    expect(channelHasUnread({ unread_count: 0 })).toBe(false);
    expect(channelHasUnread({ unread_count: 2 })).toBe(true);
  });
});
