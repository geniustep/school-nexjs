import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: apiMock,
}));

import { pickChannelFromList, resolveAdminChannel } from './resolve-admin-channel';

const channel = {
  id: 10,
  name: 'Parents QA',
  type: 'parents' as const,
  description: null,
  audience: null,
  read_only: false,
  can_send: true,
  unread_count: 0,
  member_count: 3,
  last_message_date: null,
};

describe('pickChannelFromList', () => {
  it('finds channel by id', () => {
    expect(pickChannelFromList([channel], 10)?.name).toBe('Parents QA');
    expect(pickChannelFromList([channel], 9)).toBeNull();
  });
});

describe('resolveAdminChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses detail when available', async () => {
    apiMock.get.mockResolvedValueOnce({ success: true, data: channel, meta: {} });
    const res = await resolveAdminChannel(10);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.source).toBe('detail');
      expect(res.channel.id).toBe(10);
    }
    expect(apiMock.get).toHaveBeenCalledWith('/admin/channels/10');
  });

  it('falls back to list when detail is 404 (Backend gap)', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'not_found', message: 'x', details: { status: 404 } },
        meta: {},
      })
      .mockResolvedValueOnce({ success: true, data: [channel], meta: {} });
    const res = await resolveAdminChannel(10);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.source).toBe('list');
      expect(res.channel.name).toBe('Parents QA');
    }
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/admin/channels', {
      page: 1,
      limit: 200,
    });
  });
});
