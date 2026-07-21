import { beforeEach, describe, expect, it, vi } from 'vitest';

const odooApiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/lib/config', () => ({
  config: {
    sessionCookieName: 'scc_session',
    activeRoleCookieName: 'scc_active_role',
    apiPrefix: '/api/v1',
    odooBaseUrl: 'https://odoo.test',
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'scc_session' ? { value: 'sess-cache' } : undefined),
  })),
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  isTenantSessionValid: vi.fn(async () => true),
}));

vi.mock('@/lib/auth/active-school', () => ({
  applyActiveSchoolToUser: <T>(user: T) => user,
}));

vi.mock('@/lib/auth/normalize-user', () => ({
  normalizeMeUser: <T>(user: T) => user,
}));

vi.mock('./odoo-server', () => ({
  odooApiFetch: (...args: unknown[]) => odooApiFetchMock(...args),
}));

vi.mock('./endpoints', () => ({
  endpoints: { auth: { me: '/me' } },
}));

// React cache is per-request in RSC; in vitest each import gets a fresh module cache after resetModules.
describe('getCurrentUser activeRole cache isolation', () => {
  beforeEach(() => {
    vi.resetModules();
    odooApiFetchMock.mockReset();
    odooApiFetchMock.mockImplementation(async (_path: string, opts: { activeRole?: string }) => ({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: {
          user: {
            id: 1,
            role: opts.activeRole ?? 'admin',
            active_role: opts.activeRole ?? 'admin',
            roles: ['admin', 'teacher'],
          },
        },
        meta: {},
      },
    }));
  });

  async function load() {
    return import('./server');
  }

  it('passes activeRole into odooApiFetch for teacher vs admin vs undefined', async () => {
    const { getCurrentUser } = await load();
    const admin = await getCurrentUser('admin');
    const teacher = await getCurrentUser('teacher');
    const none = await getCurrentUser(undefined);

    expect(admin?.active_role).toBe('admin');
    expect(teacher?.active_role).toBe('teacher');
    expect(none?.active_role).toBe('admin');

    const roles = odooApiFetchMock.mock.calls.map(
      (c) => (c[1] as { activeRole?: string }).activeRole,
    );
    expect(roles).toEqual(['admin', 'teacher', undefined]);
  });

  it('keeps admin and teacher results isolated when interleaved', async () => {
    const { getCurrentUser } = await load();
    const teacher = await getCurrentUser('teacher');
    const admin = await getCurrentUser('admin');
    const teacherAgain = await getCurrentUser('teacher');

    expect(teacher?.active_role).toBe('teacher');
    expect(admin?.active_role).toBe('admin');
    expect(teacherAgain?.active_role).toBe('teacher');
    expect(teacher?.active_role).not.toBe(admin?.active_role);

    // Argument is always part of the fetch options (cache key surface).
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({ activeRole: 'teacher' }),
    );
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({ activeRole: 'admin' }),
    );
  });
});
