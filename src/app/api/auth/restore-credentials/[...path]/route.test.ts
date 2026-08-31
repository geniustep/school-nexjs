import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cookiesMock,
  guardMock,
  odooApiFetchMock,
  originMock,
  runtimeMock,
  setTenantCookieMock,
  tenantMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  guardMock: vi.fn(),
  odooApiFetchMock: vi.fn(),
  originMock: vi.fn(),
  runtimeMock: vi.fn(),
  setTenantCookieMock: vi.fn(),
  tenantMock: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    apiPrefix: '/api/v1',
    sessionCookieName: 'scc_session',
    tenantCookieName: 'scc_tenant',
    activeSchoolCookieName: 'scc_active_school',
    activeRoleCookieName: 'scc_active_role',
  },
  cookieSecure: () => false,
}));

vi.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromRequest: (...args: unknown[]) => guardMock(...args),
  setTenantCookie: (...args: unknown[]) => setTenantCookieMock(...args),
}));

vi.mock('@/lib/api/odoo-server', () => ({
  odooApiFetch: (...args: unknown[]) => odooApiFetchMock(...args),
}));

vi.mock('@/lib/api/odoo-backend', () => ({
  tenantBackendNotConfiguredResponse: () =>
    new Response(
      JSON.stringify({
        success: false,
        error: { code: 'tenant_backend_not_configured', message: 'Unavailable.', details: {} },
        meta: {},
      }),
      { status: 503 },
    ),
}));

vi.mock('@/lib/api/mutation-origin', () => ({
  assertMutationOrigin: (...args: unknown[]) => originMock(...args),
  mutationOriginForbiddenBody: () => ({
    success: false,
    error: { code: 'forbidden', message: 'Origin rejected.', details: {} },
    meta: {},
  }),
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantFromRequest: (...args: unknown[]) => tenantMock(...args),
  resolveTenantRuntimeConfigFromRequest: (...args: unknown[]) => runtimeMock(...args),
}));

vi.mock('@/lib/auth/active-school', () => ({
  activeSchoolCookieOptions: () => ({ httpOnly: true, path: '/' }),
  getActiveSchoolCookie: vi.fn(async () => null),
}));

vi.mock('@/lib/auth/active-role-preference', () => ({
  activeRoleCookieOptions: () => ({ httpOnly: true, path: '/' }),
}));

vi.mock('@/lib/auth/active-role-workspace', () => ({
  isLegalActiveRole: () => true,
  isMultiRoleUser: () => false,
  normalizeRoleCode: (value: unknown) => (typeof value === 'string' ? value : null),
}));

vi.mock('@/lib/auth/normalize-user', () => ({
  normalizeMeUser: (user: unknown) => user,
  resolveActiveSchoolId: () => 10,
}));

import { POST } from './route';

function requestFor(path: string, body: unknown) {
  return new Request(`https://school.raqeem.ma/api/auth/restore-credentials/${path}`, {
    method: 'POST',
    headers: {
      host: 'school.raqeem.ma',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function contextFor(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

const user = {
  id: 7,
  name: 'Test User',
  email: null,
  role: 'parent',
  permissions: [],
  school: { id: 10, name: 'School' },
};

describe('Restore Credentials BFF route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    originMock.mockReturnValue({ ok: true });
    tenantMock.mockReturnValue({ ok: true, tenant: 'school' });
    runtimeMock.mockReturnValue({
      ok: true,
      source: 'registry',
      config: {
        host: 'school.raqeem.ma',
        tenantCode: 'school',
        backendBaseUrl: 'https://odoo.school.test',
        active: true,
        isOfficial: true,
      },
    });
    guardMock.mockResolvedValue({ ok: true });
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === 'scc_session' ? { value: 'existing-session' } : undefined),
    });
  });

  it('allows authentication/options without an existing BFF session and binds db from tenant host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { challenge_id: 'challenge-1', public_key: { challenge: 'abc' } },
          meta: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('authentication/options', {}),
      contextFor('authentication', 'options'),
    );

    expect(response.status).toBe(200);
    expect(guardMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/restore-credentials/authentication/options');
    expect(url).toContain('db=school');
    expect(init).toEqual(expect.objectContaining({ method: 'POST', body: '{}' }));
  });

  it('turns a verified Odoo Restore session into the BFF session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { user }, meta: {} }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'session_id=restore-session; Path=/; HttpOnly; SameSite=Lax',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('authentication/verify', {
        challenge_id: 'challenge-1',
        credential: { id: 'credential-1', response: {} },
      }),
      contextFor('authentication', 'verify'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('scc_session=restore-session');
    expect(setTenantCookieMock).toHaveBeenCalledWith(response, 'school');
    expect(guardMock).not.toHaveBeenCalled();
  });

  it('fails closed when Odoo reports successful Restore auth without a new session cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { user }, meta: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const response = await POST(
      requestFor('authentication/verify', {
        challenge_id: 'challenge-1',
        credential: { id: 'credential-1', response: {} },
      }),
      contextFor('authentication', 'verify'),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('server_error');
  });

  it('keeps registration behind the existing tenant-bound BFF session', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: { success: true, data: { challenge_id: 'registration-1' }, meta: {} },
    });

    const response = await POST(
      requestFor('registration/options', {}),
      contextFor('registration', 'options'),
    );

    expect(response.status).toBe(200);
    expect(guardMock).toHaveBeenCalledTimes(1);
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/auth/restore-credentials/registration/options',
      expect.objectContaining({
        method: 'POST',
        sessionId: 'existing-session',
        tenant: 'school',
        body: {},
      }),
    );
  });

  it('rejects client identity injection before any upstream call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('authentication/options', { user_id: 99 }),
      contextFor('authentication', 'options'),
    );

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });
});
