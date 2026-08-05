import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildCreateAdminChannelPayload,
  buildUpdateAdminChannelPayload,
  createAdminChannel,
  deleteAdminChannel,
  archiveAdminChannel,
  restoreAdminChannel,
  updateAdminChannel,
  listAdminChannels,
} from './admin-channels-api';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('admin-channels-api payloads', () => {
  it('builds create payload with allowlist only and without school_id', () => {
    const body = buildCreateAdminChannelPayload({
      name: '  قناة اختبار  ',
      description: ' وصف ',
      channel_type: 'teachers',
      read_only: false,
      allow_attachments: true,
      notify_email: false,
      ...({
        school_id: 99,
        allowed_actions: { delete: true },
        member_count: 5,
      } as object),
    } as Parameters<typeof buildCreateAdminChannelPayload>[0]);

    expect(body).toEqual({
      name: 'قناة اختبار',
      description: 'وصف',
      channel_type: 'teachers',
      read_only: false,
      allow_attachments: true,
      notify_email: false,
    });
    expect(body).not.toHaveProperty('school_id');
    expect(body).not.toHaveProperty('allowed_actions');
    expect(body).not.toHaveProperty('member_count');
  });

  it('includes class_id only for class / system types', () => {
    expect(
      buildCreateAdminChannelPayload({
        name: 'أ',
        channel_type: 'class',
        class_id: 12,
      }),
    ).toMatchObject({ class_id: 12 });

    expect(
      buildCreateAdminChannelPayload({
        name: 'ب',
        channel_type: 'class_staff',
        class_id: 7,
      }),
    ).toMatchObject({ class_id: 7, channel_type: 'class_staff' });

    expect(
      buildCreateAdminChannelPayload({
        name: 'ج',
        channel_type: 'teachers',
        class_id: 7,
      }),
    ).not.toHaveProperty('class_id');
  });

  it('rejects unknown channel types in create payload builder', () => {
    expect(() =>
      buildCreateAdminChannelPayload({
        name: 'x',
        channel_type: 'whatsapp' as 'teachers',
      }),
    ).toThrow('invalid_channel_type');
  });

  it('builds update payload without system identity fields', () => {
    const body = buildUpdateAdminChannelPayload({
      name: 'محدّث',
      description: 'نص',
      read_only: true,
      allow_attachments: false,
      notify_email: true,
      ...({
        channel_type: 'class_staff',
        class_id: 1,
        school_id: 2,
        is_system_managed: true,
        academic_year_id: 3,
      } as object),
    } as Parameters<typeof buildUpdateAdminChannelPayload>[0]);

    expect(body).toEqual({
      name: 'محدّث',
      description: 'نص',
      read_only: true,
      allow_attachments: false,
      notify_email: true,
    });
    expect(body).not.toHaveProperty('channel_type');
    expect(body).not.toHaveProperty('class_id');
    expect(body).not.toHaveProperty('school_id');
    expect(body).not.toHaveProperty('is_system_managed');
  });
});

describe('admin-channels-api transport', () => {
  it('lists channels and preserves meta.allowed_actions.create_channel', async () => {
    mockApi.get.mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'A', type: 'teachers' }],
      meta: { allowed_actions: { create_channel: true } },
    });
    const res = await listAdminChannels({ include_archived: 'true', page_size: 100 });
    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.channels, {
      include_archived: 'true',
      page_size: 100,
    });
    expect(res.success).toBe(true);
    const meta = res.meta as { allowed_actions?: { create_channel?: boolean } };
    expect(meta.allowed_actions?.create_channel).toBe(true);
  });

  it('posts create and patches update through BFF paths', async () => {
    mockApi.post.mockResolvedValue({
      success: true,
      data: { id: 9, name: 'N', type: 'teachers', allowed_actions: { delete: true } },
      meta: {},
    });
    mockApi.patch.mockResolvedValue({
      success: true,
      data: { id: 9, name: 'N2', type: 'teachers' },
      meta: {},
    });

    await createAdminChannel({ name: 'N', channel_type: 'teachers' });
    expect(mockApi.post).toHaveBeenCalledWith(
      '/admin/channels',
      expect.objectContaining({ name: 'N', channel_type: 'teachers' }),
      undefined,
    );
    expect(mockApi.post.mock.calls[0][1]).not.toHaveProperty('school_id');

    await updateAdminChannel(9, { description: 'd' });
    expect(mockApi.patch).toHaveBeenCalledWith(
      '/admin/channels/9',
      { description: 'd' },
      undefined,
    );
  });

  it('routes delete/archive/restore without optimistic assumptions', async () => {
    mockApi.delete.mockResolvedValue({
      success: true,
      data: { action: 'deleted', id: 3 },
      meta: {},
    });
    mockApi.post.mockResolvedValue({
      success: true,
      data: { id: 3, is_archived: true },
      meta: {},
    });

    await deleteAdminChannel(3);
    expect(mockApi.delete).toHaveBeenCalledWith('/admin/channels/3', undefined);

    await archiveAdminChannel(3);
    expect(mockApi.post).toHaveBeenCalledWith('/admin/channels/3/archive', {}, undefined);

    await restoreAdminChannel(3);
    expect(mockApi.post).toHaveBeenCalledWith('/admin/channels/3/restore', {}, undefined);
  });

  it('preserves 409 delete blocked details for UI mapping', async () => {
    mockApi.delete.mockResolvedValue({
      success: false,
      error: {
        code: 'communication_channel_delete_blocked',
        message: 'blocked',
        details: {
          status: 409,
          blocking_reasons: [{ code: 'channel_has_communication_history', count: 2 }],
          allowed_actions: { archive: true, delete: false },
        },
      },
      meta: {},
    });
    const res = await deleteAdminChannel(4);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.details?.status).toBe(409);
    expect(res.error.details?.blocking_reasons).toEqual([
      { code: 'channel_has_communication_history', count: 2 },
    ]);
  });
});
