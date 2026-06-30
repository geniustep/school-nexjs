import { beforeEach, describe, expect, it, vi } from 'vitest';

const NIBRAS_BACKEND = 'https://api-nibras.raqeem.ma';
const ALWAH_BACKEND = 'https://api-alwah.raqeem.ma';
const DEFAULT_BASE = 'https://default-odoo.example';

const { guardMock, runtimeMock, cookiesMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  runtimeMock: vi.fn(),
  cookiesMock: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    sessionCookieName: 'scc_session',
    tenantCookieName: 'scc_tenant',
    apiPrefix: '/api/v1',
    odooBaseUrl: 'https://default-odoo.example',
  },
}));

vi.mock('@/lib/auth/tenant-guard', () => ({
  guardTenantFromServerHeaders: guardMock,
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantRuntimeConfigFromServerHeaders: runtimeMock,
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

import { forwardOdooWebBinary } from './forward-odoo-web-binary';

function runtimeOk(backendBaseUrl: string, host: string, tenantCode: string) {
  return {
    ok: true as const,
    source: 'registry' as const,
    config: {
      host,
      tenantCode,
      backendBaseUrl,
      active: true,
      isOfficial: true,
    },
  };
}

describe('forwardOdooWebBinary backend resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === 'scc_session' ? { value: 'sess-1' } : undefined),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );
  });

  it('uses runtime.config.backendBaseUrl string for nibras web image URLs', async () => {
    runtimeMock.mockResolvedValue(
      runtimeOk(NIBRAS_BACKEND, 'nibras.raqeem.ma', 'nibras'),
    );

    await forwardOdooWebBinary(['image', 'partner', '1', 'avatar']);

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${NIBRAS_BACKEND}/web/image/partner/1/avatar`);
    expect(url).not.toContain('[object Object]');
  });

  it('uses runtime.config.backendBaseUrl string for alwah web image URLs', async () => {
    runtimeMock.mockResolvedValue(runtimeOk(ALWAH_BACKEND, 'alwah.raqeem.ma', 'alwah'));

    await forwardOdooWebBinary(['image', 'res.users', '2', 'image_128']);

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ALWAH_BACKEND}/web/image/res.users/2/image_128`);
    expect(url).not.toContain('[object Object]');
  });

  it('uses localhost fallback backend from runtime config', async () => {
    runtimeMock.mockResolvedValue({
      ok: true,
      source: 'fallback',
      config: {
        host: 'localhost',
        tenantCode: 'school',
        defaultPublicSchoolCode: 'school',
        backendBaseUrl: DEFAULT_BASE,
        active: true,
        isOfficial: false,
      },
    });

    await forwardOdooWebBinary(['image', 'company', '1', 'logo']);

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${DEFAULT_BASE}/web/image/company/1/logo`);
  });

  it('returns 503 when tenant backend is not configured', async () => {
    runtimeMock.mockResolvedValue({ ok: false, reason: 'tenant_backend_not_configured' });

    const res = await forwardOdooWebBinary(['image', 'partner', '1', 'avatar']);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('TENANT_BACKEND_NOT_CONFIGURED');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns 404 for invalid tenant host without building a URL', async () => {
    runtimeMock.mockResolvedValue({ ok: false, reason: 'tenant_not_in_registry' });

    const res = await forwardOdooWebBinary(['image', 'partner', '1', 'avatar']);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_tenant');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
