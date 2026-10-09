import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  guardMock,
  runtimeMock,
  cookiesMock,
  odooApiFetchMock,
  getCurrentUserMock,
  originMock,
} = vi.hoisted(() => ({
  guardMock: vi.fn(),
  runtimeMock: vi.fn(),
  cookiesMock: vi.fn(),
  odooApiFetchMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  originMock: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    sessionCookieName: 'scc_session',
    tenantCookieName: 'scc_tenant',
    apiPrefix: '/api/v1',
    odooBaseUrl: 'https://odoo.test',
  },
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromRequest: (...args: unknown[]) => guardMock(...args),
}));

vi.mock('@/lib/tenant', () => ({
  getHostFromHeaders: () => 'localhost',
  resolveTenantRuntimeConfigFromRequest: (...args: unknown[]) => runtimeMock(...args),
}));

vi.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}));

vi.mock('@/lib/api/odoo-server', () => ({
  odooApiFetch: (...args: unknown[]) => odooApiFetchMock(...args),
}));

vi.mock('@/lib/api/server', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

vi.mock('@/lib/api/odoo-backend', () => ({
  getStoredTenantSlug: vi.fn(async () => 'school'),
  tenantBackendNotConfiguredResponse: () =>
    new Response(JSON.stringify({ success: false }), { status: 503 }),
}));

vi.mock('@/lib/api/mutation-origin', () => ({
  assertMutationOrigin: (...args: unknown[]) => originMock(...args),
  mutationOriginForbiddenBody: () => ({ success: false }),
}));

vi.mock('@/lib/auth/active-school', () => ({
  getActiveSchoolCookie: vi.fn(async () => null),
  setActiveSchoolCookieValue: vi.fn(async () => undefined),
}));

import { GET, POST } from './route';

const PICKUP_PATH = ['parent', 'pickup', 'session'] as const;

function pickupPostRequest(body: unknown = {}) {
  return new NextRequest('https://app.test/api/odoo/parent/pickup/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SSC-Active-Role': 'parent',
      origin: 'https://app.test',
    },
    body: JSON.stringify(body),
  });
}

describe('BFF /api/odoo parent pickup session proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    originMock.mockReturnValue({ ok: true });
    runtimeMock.mockReturnValue({
      ok: true,
      source: 'fallback',
      config: {
        host: 'localhost',
        tenantCode: 'school',
        backendBaseUrl: 'https://odoo.test',
        active: true,
        isOfficial: true,
      },
    });
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === 'scc_session' ? { value: 'sess-pickup' } : undefined),
    });
    getCurrentUserMock.mockResolvedValue({
      id: 7,
      active_school_id: 10,
      role: 'parent',
      active_role: 'parent',
    });
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: {
        success: true,
        data: {
          token: 'qr-token-fixture',
          expires_at: '2026-10-09T12:00:00Z',
          ttl_seconds: 300,
          eligible_students: [{ id: 1, name: 'Student A' }],
        },
        meta: {},
      },
    });
  });

  it('proxies POST once with session, tenant, and active role', async () => {
    const req = pickupPostRequest({ student_id: 1 });
    const res = await POST(req, { params: Promise.resolve({ path: [...PICKUP_PATH] }) });
    expect(res.status).toBe(200);
    expect(odooApiFetchMock).toHaveBeenCalledTimes(1);
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/parent/pickup/session',
      expect.objectContaining({
        method: 'POST',
        sessionId: 'sess-pickup',
        tenant: 'school',
        activeRole: 'parent',
        body: { student_id: 1 },
      }),
    );
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBe('qr-token-fixture');
    expect(json.meta).toEqual({});
  });

  it('sets no-store cache headers on success', async () => {
    const res = await POST(pickupPostRequest(), {
      params: Promise.resolve({ path: [...PICKUP_PATH] }),
    });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  it('preserves backend error status and envelope with no-store headers', async () => {
    const cases = [
      {
        status: 409,
        body: {
          success: false,
          error: { code: 'pickup_school_context_required', message: 'School required', details: {} },
          meta: {},
        },
      },
      {
        status: 422,
        body: {
          success: false,
          error: { code: 'pickup_no_eligible_student', message: 'No student', details: {} },
          meta: {},
        },
      },
      {
        status: 401,
        body: {
          success: false,
          error: { code: 'unauthorized', message: 'Unauthorized', details: {} },
          meta: {},
        },
      },
      {
        status: 403,
        body: {
          success: false,
          error: { code: 'forbidden', message: 'Forbidden', details: {} },
          meta: {},
        },
      },
      {
        status: 503,
        body: {
          success: false,
          error: { code: 'pickup_qr_unavailable', message: 'Unavailable', details: {} },
          meta: {},
        },
      },
    ] as const;

    for (const { status, body } of cases) {
      odooApiFetchMock.mockResolvedValueOnce({ kind: 'json', status, body });
      const res = await POST(pickupPostRequest(), {
        params: Promise.resolve({ path: [...PICKUP_PATH] }),
      });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual(body);
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
      expect(res.headers.get('Pragma')).toBe('no-cache');
    }
    expect(odooApiFetchMock).toHaveBeenCalledTimes(cases.length);
  });

  it('does not inject active_school_id into JSON body', async () => {
    await POST(pickupPostRequest({ note: 'pickup-only' }), {
      params: Promise.resolve({ path: [...PICKUP_PATH] }),
    });
    const [, opts] = odooApiFetchMock.mock.calls[0] as [string, { body?: Record<string, unknown> }];
    expect(opts.body).toEqual({ note: 'pickup-only' });
    expect(opts.body).not.toHaveProperty('active_school_id');
    expect(opts.body).not.toHaveProperty('school_id');
  });

  it('denies GET on pickup session at BFF policy layer', async () => {
    const req = new NextRequest('https://app.test/api/odoo/parent/pickup/session', {
      method: 'GET',
      headers: { 'X-SSC-Active-Role': 'parent' },
    });
    const res = await GET(req, { params: Promise.resolve({ path: [...PICKUP_PATH] }) });
    expect(res.status).toBe(405);
    expect(odooApiFetchMock).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  it('sets no-store headers when mutation origin is forbidden', async () => {
    originMock.mockReturnValue({ ok: false });
    const res = await POST(pickupPostRequest(), {
      params: Promise.resolve({ path: [...PICKUP_PATH] }),
    });
    expect(res.status).toBe(403);
    expect(odooApiFetchMock).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });
});
