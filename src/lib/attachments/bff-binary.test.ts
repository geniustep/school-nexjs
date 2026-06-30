import { beforeEach, describe, expect, it, vi } from 'vitest';

const NIBRAS_BACKEND = 'https://api-nibras.raqeem.ma';
const ALWAH_BACKEND = 'https://api-alwah.raqeem.ma';
const DEFAULT_BASE = 'https://default-odoo.example';
const API_PREFIX = '/api/v1';

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

import { forwardAttachmentBinary } from './bff-binary';

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

describe('forwardAttachmentBinary backend resolution', () => {
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
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );
  });

  it('uses runtime.config.backendBaseUrl string for nibras attachment URLs', async () => {
    runtimeMock.mockResolvedValue(
      runtimeOk(NIBRAS_BACKEND, 'nibras.raqeem.ma', 'nibras'),
    );

    await forwardAttachmentBinary('42', 'download');

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${NIBRAS_BACKEND}${API_PREFIX}/attachments/42/download`);
    expect(url).not.toContain('[object Object]');
  });

  it('uses runtime.config.backendBaseUrl string for alwah attachment URLs', async () => {
    runtimeMock.mockResolvedValue(runtimeOk(ALWAH_BACKEND, 'alwah.raqeem.ma', 'alwah'));

    await forwardAttachmentBinary('99', 'preview');

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ALWAH_BACKEND}${API_PREFIX}/attachments/99/preview`);
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

    await forwardAttachmentBinary('7', 'thumbnail');

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${DEFAULT_BASE}${API_PREFIX}/attachments/7/thumbnail`);
  });

  it('returns 503 when tenant backend is not configured', async () => {
    runtimeMock.mockResolvedValue({ ok: false, reason: 'tenant_backend_not_configured' });

    const res = await forwardAttachmentBinary('1', 'download');

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('TENANT_BACKEND_NOT_CONFIGURED');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns 404 for invalid tenant host without building a URL', async () => {
    runtimeMock.mockResolvedValue({ ok: false, reason: 'tenant_not_in_registry' });

    const res = await forwardAttachmentBinary('1', 'download');

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_tenant');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
