import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const serverGetMock = vi.hoisted(() => vi.fn());
const serverPostMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  serverGet: (...args: unknown[]) => serverGetMock(...args),
  serverPost: (...args: unknown[]) => serverPostMock(...args),
}));

import { endpoints } from '@/lib/api/endpoints';
import { GET as getLibrary } from './route';
import { POST as adoptLibraryAsset } from './[libraryUid]/adopt/route';

const allowedUser = {
  id: 1,
  name: 'Admin',
  email: null,
  role: 'admin',
  permissions: [],
  effective_capabilities: ['edge.device.manage'],
  active_school_id: 3,
  school: { id: 3, name: 'School' },
};

describe('Raqeem Edge audio library BFF', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    serverGetMock.mockReset();
    serverPostMock.mockReset();
    getCurrentUserMock.mockResolvedValue(allowedUser);
  });

  it('fails closed without edge.device.manage', async () => {
    getCurrentUserMock.mockResolvedValue({
      ...allowedUser,
      effective_capabilities: [],
    });
    const response = await getLibrary();
    expect(response.status).toBe(403);
    expect(serverGetMock).not.toHaveBeenCalled();
  });

  it('proxies the curated library GET contract', async () => {
    serverGetMock.mockResolvedValue({
      success: true,
      data: { assets: [] },
      meta: {},
    });
    const response = await getLibrary();
    expect(response.status).toBe(200);
    expect(serverGetMock).toHaveBeenCalledWith(endpoints.admin.edgeAudioLibrary);
  });

  it('adopts a curated sound through the school-scoped Odoo contract', async () => {
    serverPostMock.mockResolvedValue({
      success: true,
      data: {
        adopted: true,
        asset: {
          asset_uid: 'aud_1',
          name: 'جرس الدخول',
          category: 'entry',
          source: 'raqeem_library',
          library_source_uid: 'ral_entry_standard_01',
          active: true,
          current_version: null,
        },
      },
      meta: {},
    });

    const response = await adoptLibraryAsset(
      new Request('https://app.test/api/admin/edge/audio-library/ral_entry_standard_01/adopt', {
        method: 'POST',
      }),
      { params: Promise.resolve({ libraryUid: 'ral_entry_standard_01' }) },
    );

    expect(response.status).toBe(200);
    expect(serverPostMock).toHaveBeenCalledWith(
      endpoints.admin.edgeAudioLibraryAdopt('ral_entry_standard_01'),
      {},
    );
  });
});
