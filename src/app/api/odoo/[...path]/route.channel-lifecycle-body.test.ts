import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  guardMock,
  runtimeMock,
  cookiesMock,
  odooApiFetchMock,
  getCurrentUserMock,
  originMock,
  getActiveSchoolCookieMock,
  setActiveSchoolCookieValueMock,
} = vi.hoisted(() => ({
  guardMock: vi.fn(),
  runtimeMock: vi.fn(),
  cookiesMock: vi.fn(),
  odooApiFetchMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  originMock: vi.fn(),
  getActiveSchoolCookieMock: vi.fn(),
  setActiveSchoolCookieValueMock: vi.fn(),
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

// Real bff-route-policy + bind-active-school-body — not mocked.
vi.mock('@/lib/api/mutation-origin', () => ({
  assertMutationOrigin: (...args: unknown[]) => originMock(...args),
  mutationOriginForbiddenBody: () => ({ success: false }),
}));

vi.mock('@/lib/auth/active-school', () => ({
  getActiveSchoolCookie: (...args: unknown[]) => getActiveSchoolCookieMock(...args),
  setActiveSchoolCookieValue: (...args: unknown[]) => setActiveSchoolCookieValueMock(...args),
}));

import { DELETE, PATCH, POST } from './route';

type FetchOpts = {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
  activeRole?: string;
  sessionId?: string | null;
};

function lastFetch(): [string, FetchOpts] {
  const call = odooApiFetchMock.mock.calls.at(-1) as [string, FetchOpts] | undefined;
  if (!call) throw new Error('odooApiFetch was not called');
  return call;
}

describe('BFF /api/odoo admin channel lifecycle body injection', () => {
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
      get: (name: string) => (name === 'scc_session' ? { value: 'sess-channel' } : undefined),
    });
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      active_school_id: 10,
      role: 'admin',
      active_role: 'admin',
    });
    getActiveSchoolCookieMock.mockResolvedValue(10);
    setActiveSchoolCookieValueMock.mockResolvedValue(undefined);
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 200,
      body: { success: true, data: { id: 99 }, meta: {} },
    });
  });

  it('POST create forwards body without active_school_id and keeps query/session/role', async () => {
    odooApiFetchMock.mockResolvedValue({
      kind: 'json',
      status: 201,
      body: { success: true, data: { id: 99, name: 'قناة تحقق سياسة BFF' }, meta: {} },
    });
    const payload = {
      name: 'قناة تحقق سياسة BFF',
      description: 'بيانات اختبار مؤقتة',
      channel_type: 'teachers',
    };
    const req = new NextRequest(
      'https://app.test/api/odoo/admin/channels?include_archived=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SSC-Active-Role': 'admin',
          origin: 'https://app.test',
        },
        body: JSON.stringify(payload),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ path: ['admin', 'channels'] }) });
    expect(res.status).toBe(201);
    const [path, opts] = lastFetch();
    expect(path).toBe('/admin/channels');
    expect(opts.method).toBe('POST');
    expect(opts.activeRole).toBe('admin');
    expect(opts.sessionId).toBe('sess-channel');
    expect(opts.query?.active_school_id).toBe('10');
    expect(opts.query?.include_archived).toBe('true');
    expect(opts.body).toEqual(payload);
    expect(opts.body).not.toHaveProperty('active_school_id');
    expect(opts.body).not.toHaveProperty('school_id');
  });

  it('PATCH update forwards body without school/system identity fields', async () => {
    const req = new NextRequest('https://app.test/api/odoo/admin/channels/12', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-SSC-Active-Role': 'admin',
        origin: 'https://app.test',
      },
      body: JSON.stringify({ name: 'قناة تحقق سياسة BFF — محدثة' }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ path: ['admin', 'channels', '12'] }),
    });
    expect(res.status).toBe(200);
    const [path, opts] = lastFetch();
    expect(path).toBe('/admin/channels/12');
    expect(opts.method).toBe('PATCH');
    expect(opts.activeRole).toBe('admin');
    expect(opts.query?.active_school_id).toBe('10');
    expect(opts.body).toEqual({ name: 'قناة تحقق سياسة BFF — محدثة' });
    expect(opts.body).not.toHaveProperty('active_school_id');
    expect(opts.body).not.toHaveProperty('school_id');
    expect(opts.body).not.toHaveProperty('class_id');
    expect(opts.body).not.toHaveProperty('academic_year_id');
    expect(opts.body).not.toHaveProperty('is_system_managed');
  });

  it('archive and restore do not synthesize an active_school_id body', async () => {
    for (const action of ['archive', 'restore'] as const) {
      odooApiFetchMock.mockClear();
      const req = new NextRequest(`https://app.test/api/odoo/admin/channels/12/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SSC-Active-Role': 'admin',
          origin: 'https://app.test',
        },
        body: JSON.stringify({}),
      });
      const res = await POST(req, {
        params: Promise.resolve({ path: ['admin', 'channels', '12', action] }),
      });
      expect(res.status).toBe(200);
      const [path, opts] = lastFetch();
      expect(path).toBe(`/admin/channels/12/${action}`);
      expect(opts.body).toEqual({});
      expect(opts.query?.active_school_id).toBe('10');
      expect(opts.activeRole).toBe('admin');
    }
  });

  it('DELETE does not synthesize an active_school_id body', async () => {
    const req = new NextRequest('https://app.test/api/odoo/admin/channels/12', {
      method: 'DELETE',
      headers: {
        'X-SSC-Active-Role': 'admin',
        origin: 'https://app.test',
      },
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ path: ['admin', 'channels', '12'] }),
    });
    expect(res.status).toBe(200);
    const [path, opts] = lastFetch();
    expect(path).toBe('/admin/channels/12');
    expect(opts.method).toBe('DELETE');
    expect(opts.body).toBeUndefined();
    expect(opts.query?.active_school_id).toBe('10');
    expect(opts.activeRole).toBe('admin');
  });

  it('rejects client-supplied mismatched active_school_id before upstream', async () => {
    const req = new NextRequest('https://app.test/api/odoo/admin/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SSC-Active-Role': 'admin',
        origin: 'https://app.test',
      },
      body: JSON.stringify({
        name: 'x',
        channel_type: 'teachers',
        active_school_id: 99,
      }),
    });
    const res = await POST(req, { params: Promise.resolve({ path: ['admin', 'channels'] }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('validation_error');
    expect(body.error.details.reason).toBe('active_school_id_mismatch');
    expect(odooApiFetchMock).not.toHaveBeenCalled();
  });

  it('preserves upstream status and error envelope for lifecycle create', async () => {
    const cases = [
      {
        status: 400,
        body: {
          success: false,
          error: { code: 'validation_error', message: 'bad', details: {} },
          meta: {},
        },
      },
      {
        status: 401,
        body: {
          success: false,
          error: { code: 'unauthorized', message: 'auth', details: {} },
          meta: {},
        },
      },
      {
        status: 403,
        body: {
          success: false,
          error: { code: 'forbidden', message: 'no', details: {} },
          meta: {},
        },
      },
      {
        status: 409,
        body: {
          success: false,
          error: {
            code: 'communication_channel_delete_blocked',
            message: 'blocked',
            details: {
              blocking_reasons: [{ code: 'channel_has_communication_history' }],
              allowed_actions: { archive: true, delete: false },
            },
          },
          meta: {},
        },
      },
      {
        status: 422,
        body: {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Unsupported fields: active_school_id',
            details: {},
          },
          meta: {},
        },
      },
    ] as const;

    for (const sample of cases) {
      odooApiFetchMock.mockResolvedValueOnce({
        kind: 'json',
        status: sample.status,
        body: sample.body,
      });
      const req = new NextRequest('https://app.test/api/odoo/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SSC-Active-Role': 'admin',
          origin: 'https://app.test',
        },
        body: JSON.stringify({ name: 'x', channel_type: 'teachers' }),
      });
      const res = await POST(req, { params: Promise.resolve({ path: ['admin', 'channels'] }) });
      expect(res.status).toBe(sample.status);
      const json = await res.json();
      expect(json).toEqual(sample.body);
      expect(json.error.code).toBe(sample.body.error.code);
      if (sample.status === 409) {
        expect(json.error.details.blocking_reasons).toEqual(
          sample.body.error.details.blocking_reasons,
        );
        expect(json.error.details.allowed_actions).toEqual(
          sample.body.error.details.allowed_actions,
        );
      }
    }
  });

  it('still injects active_school_id for nested channel messages POST', async () => {
    const req = new NextRequest('https://app.test/api/odoo/admin/channels/12/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SSC-Active-Role': 'admin',
        origin: 'https://app.test',
      },
      body: JSON.stringify({ body: 'hello' }),
    });
    await POST(req, {
      params: Promise.resolve({ path: ['admin', 'channels', '12', 'messages'] }),
    });
    const [path, opts] = lastFetch();
    expect(path).toBe('/admin/channels/12/messages');
    expect(opts.body).toMatchObject({ body: 'hello', active_school_id: 10 });
  });

  it('still injects active_school_id for recipient-preview POST', async () => {
    const req = new NextRequest(
      'https://app.test/api/odoo/admin/channels/12/messages/recipient-preview',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SSC-Active-Role': 'admin',
          origin: 'https://app.test',
        },
        body: JSON.stringify({ audience: 'all' }),
      },
    );
    await POST(req, {
      params: Promise.resolve({
        path: ['admin', 'channels', '12', 'messages', 'recipient-preview'],
      }),
    });
    const [path, opts] = lastFetch();
    expect(path).toBe('/admin/channels/12/messages/recipient-preview');
    expect(opts.body).toMatchObject({ audience: 'all', active_school_id: 10 });
  });
});
