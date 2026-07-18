import { describe, expect, it } from 'vitest';
import {
  channelsEndpointsForRole,
  isAdminChannelMessagesPath,
  isAdminPendingResubmitPath,
} from './channel-endpoints';

describe('channelsEndpointsForRole admin (Backend 228)', () => {
  const admin = channelsEndpointsForRole('admin');

  it('uses admin GET messages path (not portal)', () => {
    expect(admin.messages(10)).toBe('/admin/channels/10/messages');
    expect(admin.messages(10)).toMatch(/^\/admin\/channels\//);
    expect(admin.messages(10)).not.toMatch(/^\/channels\//);
    expect(isAdminChannelMessagesPath(admin.messages(10))).toBe(true);
  });

  it('uses admin resubmit path (not portal)', () => {
    const path = admin.pendingMessageResubmit(10, 34);
    expect(path).toBe('/admin/channels/10/pending-messages/34/resubmit');
    expect(path).not.toMatch(/^\/channels\//);
    expect(isAdminPendingResubmitPath(path)).toBe(true);
  });

  it('uses admin pending list for myPendingMessages', () => {
    expect(admin.myPendingMessages(10)).toBe('/admin/channels/10/pending-messages');
  });
});

describe('channelsEndpointsForRole portal', () => {
  const teacher = channelsEndpointsForRole('teacher');

  it('keeps portal messages and portal resubmit for non-admin', () => {
    expect(teacher.messages(10)).toBe('/channels/10/messages');
    expect(teacher.pendingMessageResubmit(10, 34)).toBe(
      '/channels/10/pending-messages/34/resubmit',
    );
    expect(isAdminChannelMessagesPath(teacher.messages(10))).toBe(false);
    expect(isAdminPendingResubmitPath(teacher.pendingMessageResubmit(10, 34))).toBe(false);
  });
});
