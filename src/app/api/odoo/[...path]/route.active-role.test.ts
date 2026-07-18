import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  guardMock,
  runtimeMock,
  cookiesMock,
  odooApiFetchMock,
  getCurrentUserMock,
  policyMock,
  originMock,
} = vi.hoisted(() => ({
  guardMock: vi.fn(),
  runtimeMock: vi.fn(),
  cookiesMock: vi.fn(),
  odooApiFetchMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  policyMock: vi.fn(),
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

vi.mock('@/lib/api/bff-route-policy', () => ({
  assertBffRoutePolicy: (...args: unknown[]) => policyMock(...args),
  shouldBindActiveSchoolInBody: () => false,
  shouldInjectActiveSchoolIdInBody: () => false,
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

describe('generic /api/odoo proxy active-role transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    originMock.mockReturnValue({ ok: true });
    policyMock.mockReturnValue({ ok: true });
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
      get: (name: string) => (name === 'scc_session' ? { value: 'sess-1' } : undefined),
    });
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      active_school_id: 10,
      role: 'admin',
      active_role: 'admin',
    });
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: { success: true, data: { ok: true }, meta: {} },
    });
  });

  it('forwards header active role to odooApiFetch', async () => {
    const req = new NextRequest('https://app.test/api/odoo/teacher/today', {
      headers: { 'X-SSC-Active-Role': 'teacher' },
    });
    const res = await GET(req, { params: Promise.resolve({ path: ['teacher', 'today'] }) });
    expect(res.status).toBe(200);
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/teacher/today',
      expect.objectContaining({
        activeRole: 'teacher',
        sessionId: 'sess-1',
        method: 'GET',
      }),
    );
  });

  it('normalizes query active_role into header option and strips it from query', async () => {
    const req = new NextRequest(
      'https://app.test/api/odoo/teacher/today?active_role=teacher&page=2',
    );
    await GET(req, { params: Promise.resolve({ path: ['teacher', 'today'] }) });
    const opts = odooApiFetchMock.mock.calls[0][1] as {
      activeRole?: string;
      query: Record<string, string>;
    };
    expect(opts.activeRole).toBe('teacher');
    expect(opts.query.active_role).toBeUndefined();
    expect(opts.query.page).toBe('2');
  });

  it('preserves active_school_id injection for admin paths with role context', async () => {
    const req = new NextRequest('https://app.test/api/odoo/admin/students', {
      headers: { 'X-SSC-Active-Role': 'admin' },
    });
    await GET(req, { params: Promise.resolve({ path: ['admin', 'students'] }) });
    expect(getCurrentUserMock).toHaveBeenCalledWith('admin');
    const opts = odooApiFetchMock.mock.calls[0][1] as {
      query: Record<string, string>;
      activeRole?: string;
    };
    expect(opts.activeRole).toBe('admin');
    expect(opts.query.active_school_id).toBe('10');
  });

  it('preserves POST body and method with active role', async () => {
    const req = new NextRequest('https://app.test/api/odoo/teacher/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SSC-Active-Role': 'teacher',
      },
      body: JSON.stringify({ title: 'hw' }),
    });
    await POST(req, { params: Promise.resolve({ path: ['teacher', 'items'] }) });
    expect(odooApiFetchMock).toHaveBeenCalledWith(
      '/teacher/items',
      expect.objectContaining({
        method: 'POST',
        activeRole: 'teacher',
        body: { title: 'hw' },
      }),
    );
  });

  it('rejects invalid role before odooApiFetch', async () => {
    const req = new NextRequest('https://app.test/api/odoo/me', {
      headers: { 'X-SSC-Active-Role': 'wizard' },
    });
    const res = await GET(req, { params: Promise.resolve({ path: ['me'] }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_active_role');
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('rejects conflicting header/query before odooApiFetch', async () => {
    const req = new NextRequest('https://app.test/api/odoo/me?active_role=admin', {
      headers: { 'X-SSC-Active-Role': 'teacher' },
    });
    const res = await GET(req, { params: Promise.resolve({ path: ['me'] }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('active_role_conflict');
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('does not pass arbitrary request headers into odooApiFetch options', async () => {
    const req = new NextRequest('https://app.test/api/odoo/teacher/today', {
      headers: {
        'X-SSC-Active-Role': 'teacher',
        Authorization: 'Bearer leak',
        'X-Custom-Evil': '1',
      },
    });
    await GET(req, { params: Promise.resolve({ path: ['teacher', 'today'] }) });
    const opts = odooApiFetchMock.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.activeRole).toBe('teacher');
    expect(opts).not.toHaveProperty('headers');
    expect(JSON.stringify(opts)).not.toContain('Bearer leak');
    expect(JSON.stringify(opts)).not.toContain('X-Custom-Evil');
  });

  it('teacher then parent calls stay isolated (no sticky role)', async () => {
    const teacherReq = new NextRequest('https://app.test/api/odoo/teacher/today', {
      headers: { 'X-SSC-Active-Role': 'teacher' },
    });
    const parentReq = new NextRequest('https://app.test/api/odoo/me', {
      headers: { 'X-SSC-Active-Role': 'parent' },
    });
    await GET(teacherReq, { params: Promise.resolve({ path: ['teacher', 'today'] }) });
    await GET(parentReq, { params: Promise.resolve({ path: ['me'] }) });
    expect(odooApiFetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ activeRole: 'teacher' }),
    );
    expect(odooApiFetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ activeRole: 'parent' }),
    );
  });
});
