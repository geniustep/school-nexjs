import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  guardMock,
  getCurrentUserMock,
} = vi.hoisted(() => ({
  guardMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromRequest: (...args: unknown[]) => guardMock(...args),
}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

import { GET } from './route';

const meUser = {
  id: 7,
  name: 'Done Multi',
  role: 'admin',
  roles: ['admin', 'teacher'],
  active_role: 'admin',
  available_roles: [
    { code: 'admin', label: 'Admin' },
    { code: 'teacher', label: 'Teacher' },
  ],
};

describe('GET /api/auth/me active-role transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    getCurrentUserMock.mockResolvedValue(meUser);
  });

  it('without header keeps default role path (undefined activeRole)', async () => {
    const res = await GET(new Request('https://app.test/api/auth/me'));
    expect(res.status).toBe(200);
    expect(getCurrentUserMock).toHaveBeenCalledWith(undefined);
    const body = await res.json();
    expect(body.data.user.active_role).toBe('admin');
    expect(body.data.user.role).toBe('admin');
    expect(body.data.user.roles).toEqual(['admin', 'teacher']);
    expect(body.data.user.available_roles).toHaveLength(2);
  });

  it('forwards teacher header to getCurrentUser', async () => {
    getCurrentUserMock.mockResolvedValue({
      ...meUser,
      role: 'teacher',
      active_role: 'teacher',
    });
    const res = await GET(
      new Request('https://app.test/api/auth/me', {
        headers: { 'X-SSC-Active-Role': 'teacher' },
      }),
    );
    expect(res.status).toBe(200);
    expect(getCurrentUserMock).toHaveBeenCalledWith('teacher');
    const body = await res.json();
    expect(body.data.user.active_role).toBe('teacher');
  });

  it('reflects Odoo decision for unowned legal role (parent stays admin)', async () => {
    getCurrentUserMock.mockResolvedValue({
      ...meUser,
      active_role: 'admin',
      role: 'admin',
    });
    const res = await GET(
      new Request('https://app.test/api/auth/me', {
        headers: { 'X-SSC-Active-Role': 'parent' },
      }),
    );
    expect(getCurrentUserMock).toHaveBeenCalledWith('parent');
    const body = await res.json();
    expect(body.data.user.active_role).toBe('admin');
  });

  it('rejects invalid role with 400 and never calls getCurrentUser', async () => {
    const res = await GET(
      new Request('https://app.test/api/auth/me', {
        headers: { 'X-SSC-Active-Role': 'hacker' },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('invalid_active_role');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('accepts matching query active_role', async () => {
    getCurrentUserMock.mockResolvedValue({
      ...meUser,
      role: 'teacher',
      active_role: 'teacher',
    });
    const res = await GET(new Request('https://app.test/api/auth/me?active_role=teacher'));
    expect(res.status).toBe(200);
    expect(getCurrentUserMock).toHaveBeenCalledWith('teacher');
  });

  it('rejects header/query conflict with 400', async () => {
    const res = await GET(
      new Request('https://app.test/api/auth/me?active_role=admin', {
        headers: { 'X-SSC-Active-Role': 'teacher' },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('active_role_conflict');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('preserves role/roles/active_role/available_roles fields from Odoo user', async () => {
    const res = await GET(
      new Request('https://app.test/api/auth/me', {
        headers: { 'x-ssc-active-role': 'Teacher' },
      }),
    );
    const body = await res.json();
    expect(body.data.user).toMatchObject({
      role: expect.any(String),
      roles: expect.any(Array),
      active_role: expect.any(String),
      available_roles: expect.any(Array),
    });
  });
});
