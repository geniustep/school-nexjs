import { describe, expect, it } from 'vitest';
import { endpoints } from './endpoints';
import {
  channelsEndpointsForRole,
  isAdminChannelMessagesPath,
  isAdminChannelRecipientPreviewPath,
  isAdminPendingResubmitPath,
} from './channel-endpoints';

describe('channelsEndpointsForRole admin (Backend 228/229)', () => {
  const admin = channelsEndpointsForRole('admin');

  it('uses admin GET messages path (not portal)', () => {
    expect(admin.messages(10)).toBe('/admin/channels/10/messages');
    expect(admin.messages(10)).toMatch(/^\/admin\/channels\//);
    expect(admin.messages(10)).not.toMatch(/^\/channels\//);
    expect(isAdminChannelMessagesPath(admin.messages(10))).toBe(true);
  });

  it('uses admin recipient-preview path (not portal)', () => {
    const path = admin.messageRecipientPreview(10);
    expect(path).toBe('/admin/channels/10/messages/recipient-preview');
    expect(path).not.toMatch(/^\/channels\//);
    expect(isAdminChannelRecipientPreviewPath(path)).toBe(true);
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
  const parent = channelsEndpointsForRole('parent');
  const student = channelsEndpointsForRole('student');

  it('keeps portal messages, preview, and resubmit for non-admin', () => {
    expect(teacher.messages(10)).toBe('/channels/10/messages');
    expect(teacher.messageRecipientPreview(10)).toBe(
      '/channels/10/messages/recipient-preview',
    );
    expect(teacher.pendingMessageResubmit(10, 34)).toBe(
      '/channels/10/pending-messages/34/resubmit',
    );
    expect(isAdminChannelMessagesPath(teacher.messages(10))).toBe(false);
    expect(isAdminChannelRecipientPreviewPath(teacher.messageRecipientPreview(10))).toBe(false);
    expect(isAdminPendingResubmitPath(teacher.pendingMessageResubmit(10, 34))).toBe(false);
  });

  it('parent and student use portal preview (not admin)', () => {
    expect(parent.messageRecipientPreview(3)).toBe('/channels/3/messages/recipient-preview');
    expect(student.messageRecipientPreview(3)).toBe('/channels/3/messages/recipient-preview');
    expect(isAdminChannelRecipientPreviewPath(parent.messageRecipientPreview(3))).toBe(false);
  });
});

describe('B4 content recipient-preview endpoint construction', () => {
  it('builds admin and staff content preview paths with numeric ids', () => {
    expect(endpoints.admin.communicationContentRecipientPreview(34)).toBe(
      '/admin/communication/content/34/recipient-preview',
    );
    expect(endpoints.staff.communicationContentRecipientPreview(34)).toBe(
      '/staff/communication/content/34/recipient-preview',
    );
  });
});
