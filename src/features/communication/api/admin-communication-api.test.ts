import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: apiMock,
}));

import {
  createAdminCommunicationContent,
  previewAdminRecipientScope,
  previewIndividualCommunication,
  submitIndividualCommunication,
  updateAdminCommunicationContent,
  fetchAdminChannelMessages,
  previewAdminCommunicationContentRecipients,
  previewStaffCommunicationContentRecipients,
  resubmitAdminChannelPendingMessage,
} from './admin-communication-api';

describe('admin communication API — Backend 228/229/259 paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockResolvedValue({ success: true, data: [], meta: {} });
    apiMock.post.mockResolvedValue({
      success: true,
      data: { pending_review: true, communication_state: 'submitted' },
      meta: {},
    });
    apiMock.patch.mockResolvedValue({
      success: true,
      data: { id: 10, state: 'draft' },
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

  it('POST generic recipient-preview with canonical scope and no school_id', async () => {
    apiMock.post.mockResolvedValue({
      success: true,
      data: {
        recipient_summary: {
          deliverable_user_count: 9,
          can_submit: true,
          teacher_count: 2,
        },
      },
      meta: {},
    });
    const result = await previewAdminRecipientScope({
      recipient_scope: {
        scope_type: 'class',
        beneficiary_kind: 'students_and_guardians',
        scope_id: 5,
      },
      subject: 'Hello',
      body: 'Body',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/admin/communication/recipient-preview', {
      recipient_scope: {
        scope_type: 'class',
        beneficiary_kind: 'students_and_guardians',
        scope_id: 5,
      },
      subject: 'Hello',
      body: 'Body',
    });
    const body = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('school_id');
    expect(body).not.toHaveProperty('recipient_ids');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.recipient_summary.deliverable_user_count).toBe(9);
      expect(result.preview.recipient_summary.teacher_count).toBe(2);
    }
  });

  it('POST admin content create with recipient_scope', async () => {
    apiMock.post.mockResolvedValue({
      success: true,
      data: { id: 77, state: 'draft' },
      meta: {},
    });
    await createAdminCommunicationContent({
      subject: 'S',
      body: 'B',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'staff' },
    });
    expect(apiMock.post).toHaveBeenCalledWith('/admin/communication/content', {
      subject: 'S',
      body: 'B',
      content_type: 'message',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'staff' },
    });
    const body = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('school_id');
  });

  it('PATCH admin content draft', async () => {
    await updateAdminCommunicationContent(77, {
      subject: 'S2',
      body: 'B2',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'teachers' },
    });
    expect(apiMock.patch).toHaveBeenCalledWith('/admin/communication/content/77', {
      subject: 'S2',
      body: 'B2',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'teachers' },
    });
  });

  it('POST individual with domain recipient_id (no res.users id field)', async () => {
    await submitIndividualCommunication({
      recipient_type: 'student',
      recipient_id: 44,
      subject: 'Hi',
      body: 'Body',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/admin/communication/individual', {
      recipient_type: 'student',
      recipient_id: 44,
      subject: 'Hi',
      body: 'Body',
    });
    const body = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('user_id');
    expect(body).not.toHaveProperty('res_users_id');
  });

  it('POST individual preview with domain recipient_id only', async () => {
    apiMock.post.mockResolvedValue({
      success: true,
      data: {
        recipient_type: 'student',
        deliverable_user_count: 1,
        can_submit: true,
        account_status: null,
      },
      meta: {},
    });
    const result = await previewIndividualCommunication({
      recipient_type: 'student',
      recipient_id: 44,
    });
    expect(apiMock.post).toHaveBeenCalledWith('/admin/communication/individual/preview', {
      recipient_type: 'student',
      recipient_id: 44,
    });
    const body = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('school_id');
    expect(body).not.toHaveProperty('user_id');
    expect(body).not.toHaveProperty('recipient_user_id');
    expect(body).not.toHaveProperty('recipient_ids');
    expect(body).not.toHaveProperty('deliverable_user_count');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.can_submit).toBe(true);
      expect(result.preview.deliverable_user_count).toBe(1);
    }
  });
});
