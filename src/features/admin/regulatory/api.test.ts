import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRegulatorySettings, updateRegulatorySettings } from './api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

describe('regulatory settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ success: true, data: { updates_enabled: true }, meta: {} });
    mocks.post.mockResolvedValue({ success: true, data: { updates_enabled: true }, meta: {} });
  });

  it('loads settings from the narrow admin settings endpoint', async () => {
    await fetchRegulatorySettings();

    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledWith('/admin/regulatory-calendar/settings');
  });

  it('sends exactly updates_enabled when enabling reception', async () => {
    await updateRegulatorySettings(true);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/admin/regulatory-calendar/settings', {
      updates_enabled: true,
    });
  });

  it('sends exactly updates_enabled when disabling reception', async () => {
    await updateRegulatorySettings(false);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/admin/regulatory-calendar/settings', {
      updates_enabled: false,
    });
  });
});
