import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  originMock,
  runtimeMock,
  tenantMock,
} = vi.hoisted(() => ({
  originMock: vi.fn(),
  runtimeMock: vi.fn(),
  tenantMock: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: { apiPrefix: '/api/v1' },
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

import { POST } from './route';

function requestFor(stage: string, body: unknown) {
  return new Request(`https://nibras.raqeem.ma/api/auth/password-recovery/${stage}`, {
    method: 'POST',
    headers: {
      host: 'nibras.raqeem.ma',
      origin: 'https://nibras.raqeem.ma',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function contextFor(stage: string) {
  return { params: Promise.resolve({ stage }) };
}

describe('Password Recovery BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    originMock.mockReturnValue({ ok: true });
    tenantMock.mockReturnValue({ ok: true, tenant: 'nibras' });
    runtimeMock.mockReturnValue({
      ok: true,
      source: 'registry',
      config: {
        host: 'nibras.raqeem.ma',
        tenantCode: 'nibras',
        backendBaseUrl: 'https://odoo.nibras.test',
        active: true,
        isOfficial: true,
      },
    });
  });

  it('proxies generic request semantics without adding identity fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { status: 'accepted' }, meta: {} }),
        { status: 202, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('request', { phone: '0668707907' }),
      contextFor('request'),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({ success: true, data: { status: 'accepted' }, meta: {} });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/password-recovery/request');
    expect(url).toContain('db=nibras');
    expect(init.body).toBe(JSON.stringify({ phone: '0668707907' }));
  });

  it('rejects client identity injection before upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('request', { phone: '0668707907', user_id: 7 }),
      contextFor('request'),
    );

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves recovery token only in the verify response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { recovery_token: 'opaque-recovery-secret' },
          meta: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      requestFor('verify', { phone: '0668707907', otp: '123456' }),
      contextFor('verify'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recovery_token).toBe('opaque-recovery-secret');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('preserves Retry-After on rate limiting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'rate_limited', message: 'Too many requests.', details: {} },
            meta: {},
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          },
        ),
      ),
    );

    const response = await POST(
      requestFor('request', { phone: '0668707907' }),
      contextFor('request'),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });

  it('keeps activation and restore-credentials namespaces out of the recovery route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { status: 'accepted' }, meta: {} }),
        { status: 202, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await POST(
      requestFor('request', { phone: '0668707907' }),
      contextFor('request'),
    );

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('account-activation');
    expect(url).not.toContain('restore-credentials');
  });
});
