import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: apiMock,
}));

import {
  fetchAdminChannelMessages,
  previewAdminCommunicationContentRecipients,
  previewStaffCommunicationContentRecipients,
  resubmitAdminChannelPendingMessage,
} from './admin-communication-api';

describe('admin communication API — Backend 228/229 paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockResolvedValue({ success: true, data: [], meta: {} });
    apiMock.post.mockResolvedValue({
      success: true,
      data: { pending_review: true, communication_state: 'submitted' },
      meta: {},
    });
  });

  it('GET admin channel messages with page/limit (not portal)', async () => {
    await fetchAdminChannelMessages(10, { page: 2, limit: 25 });
    expect(apiMock.get).toHaveBeenCalledWith('/admin/channels/10/messages', {
      page: 2,
      limit: 25,
    });
    const path = apiMock.get.mock.calls[0][0] as string;
    expect(path.startsWith('/admin/channels/')).toBe(true);
    expect(path).not.toBe('/channels/10/messages');
  });

  it('POST admin resubmit with body and optional subject', async () => {
    await resubmitAdminChannelPendingMessage(10, 34, {
      body: '<p>QA fix</p>',
      subject: 'Updated',
    });
    expect(apiMock.post).toHaveBeenCalledWith(
      '/admin/channels/10/pending-messages/34/resubmit',
      { body: '<p>QA fix</p>', subject: 'Updated' },
    );
  });

  it('POST admin resubmit omits empty subject', async () => {
    await resubmitAdminChannelPendingMessage(10, 34, { body: 'text', subject: '' });
    expect(apiMock.post).toHaveBeenCalledWith(
      '/admin/channels/10/pending-messages/34/resubmit',
      { body: 'text' },
    );
  });

  it('POST admin content recipient-preview (not portal, not staff)', async () => {
    apiMock.post.mockResolvedValue({
      success: true,
      data: { recipient_summary: { total_people_count: 4, can_submit: true } },
      meta: {},
    });
    const result = await previewAdminCommunicationContentRecipients(34);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/admin/communication/content/34/recipient-preview',
      {},
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.presentation).toBe('preview');
      expect(result.preview.recipient_summary.total_people_count).toBe(4);
    }
  });

  it('POST staff content recipient-preview path for contract reuse', async () => {
    apiMock.post.mockResolvedValue({
      success: true,
      data: { total_people_count: 1 },
      meta: {},
    });
    const result = await previewStaffCommunicationContentRecipients(12);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/staff/communication/content/12/recipient-preview',
      {},
    );
    expect(result.ok).toBe(true);
  });
});
