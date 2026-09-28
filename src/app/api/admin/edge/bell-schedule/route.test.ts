import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const serverGetMock = vi.hoisted(() => vi.fn());
const serverPutMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  serverGet: (...args: unknown[]) => serverGetMock(...args),
  serverPut: (...args: unknown[]) => serverPutMock(...args),
}));

import { endpoints } from '@/lib/api/endpoints';
import { GET, PUT } from './route';

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

describe('Raqeem Edge bell schedule BFF', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    serverGetMock.mockReset();
    serverPutMock.mockReset();
    getCurrentUserMock.mockResolvedValue(allowedUser);
  });

  it('rejects users without edge.device.manage before Odoo', async () => {
    getCurrentUserMock.mockResolvedValue({ ...allowedUser, effective_capabilities: [] });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(serverGetMock).not.toHaveBeenCalled();
  });

  it('proxies GET to the dedicated Odoo endpoint', async () => {
    serverGetMock.mockResolvedValue({
      success: true,
      data: {
        school: { id: 3, name: 'School', timezone: 'Africa/Casablanca' },
        schedule: null,
        active_version: null,
      },
      meta: {},
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(serverGetMock).toHaveBeenCalledWith(endpoints.admin.edgeBellSchedule);
  });

  it('forwards the exact save-and-activate payload', async () => {
    const payload = {
      schedule_id: null,
      name: 'Main',
      range_start: '2026-09-28',
      range_end: '2026-12-31',
      events: [
        {
          id: null,
          weekday: '0',
          local_time: '08:00',
          label: 'Start',
          audio_asset_uid: 'aud_1',
          active: true,
        },
      ],
    };
    serverPutMock.mockResolvedValue({
      success: true,
      data: {
        school: { id: 3, name: 'School', timezone: 'Africa/Casablanca' },
        schedule: { id: 8, name: 'Main', code: 'bell_default', active: true, events: [] },
        active_version: null,
      },
      meta: {},
    });

    const response = await PUT(
      new Request('https://app.test/api/admin/edge/bell-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    expect(serverPutMock).toHaveBeenCalledWith(endpoints.admin.edgeBellSchedule, payload);
  });

  it('rejects a malformed body before Odoo', async () => {
    const response = await PUT(
      new Request('https://app.test/api/admin/edge/bell-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      }),
    );
    expect(response.status).toBe(422);
    expect(serverPutMock).not.toHaveBeenCalled();
  });
});
