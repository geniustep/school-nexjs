import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const cookieSetMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromRequest: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/config', () => ({
  config: { activeRoleCookieName: 'scc_active_role' },
  cookieSecure: () => false,
}));

vi.mock('@/lib/auth/active-role-preference', () => ({
  activeRoleCookieOptions: () => ({
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  }),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => {
        const headers = new Headers({ 'content-type': 'application/json' });
        const res = {
          status: init?.status ?? 200,
          headers,
          cookies: { set: cookieSetMock },
          json: async () => body,
        };
        return res;
      },
    },
  };
});

import { POST } from './route';

const multiUser = {
  id: 2,
  name: 'Administrator',
  email: null,
  role: 'admin' as const,
  active_role: 'admin',
  roles: ['admin', 'teacher'],
  available_roles: [
    { code: 'admin', label: 'مدير' },
    { code: 'teacher', label: 'أستاذة' },
  ],
  permissions: ['view_dashboard'],
  school: null,
};

describe('POST /api/auth/active-role', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    cookieSetMock.mockReset();
  });

  it('confirms admin → teacher and sets cookie', async () => {
    getCurrentUserMock
      .mockResolvedValueOnce(multiUser)
      .mockResolvedValueOnce({
        ...multiUser,
        role: 'teacher',
        active_role: 'teacher',
        permissions: ['view_timetable'],
      });

    const res = await POST(
      new Request('https://app.test/api/auth/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_role: 'teacher' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.active_role).toBe('teacher');
    expect(body.data.home).toBe('/teacher/dashboard');
    expect(cookieSetMock).toHaveBeenCalledWith(
      'scc_active_role',
      'teacher',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('rejects unowned roles without setting cookie', async () => {
    getCurrentUserMock.mockResolvedValueOnce(multiUser);

    const res = await POST(
      new Request('https://app.test/api/auth/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_role: 'parent' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('role_not_available');
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it('rejects invalid_active_role', async () => {
    getCurrentUserMock.mockResolvedValueOnce(multiUser);

    const res = await POST(
      new Request('https://app.test/api/auth/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_role: 'director' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('invalid_active_role');
  });

  it('fails closed when Odoo does not confirm the requested role', async () => {
    getCurrentUserMock
      .mockResolvedValueOnce(multiUser)
      .mockResolvedValueOnce({ ...multiUser, role: 'admin', active_role: 'admin' });

    const res = await POST(
      new Request('https://app.test/api/auth/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_role: 'teacher' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('role_not_available');
    expect(cookieSetMock).not.toHaveBeenCalled();
  });
});
