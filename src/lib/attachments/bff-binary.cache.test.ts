import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('forwardAttachmentBinary private cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    runtimeMock.mockResolvedValue({
      ok: true,
      source: 'registry',
      config: {
        host: 'school.raqeem.ma',
        tenantCode: 'school',
        backendBaseUrl: 'https://api-school.example',
        active: true,
        isOfficial: false,
      },
    });
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === 'scc_session' ? { value: 'sess-1' } : undefined),
    });
  });

  it('forces private no-store when upstream omits Cache-Control', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () => new ArrayBuffer(2),
      }),
    );

    const res = await forwardAttachmentBinary('42', 'download');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(res.headers.get('Pragma')).toBe('no-cache');
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('overrides upstream public cache headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'image/png',
          'content-disposition': 'inline; filename="a.png"',
          'cache-control': 'public, max-age=86400',
        }),
        arrayBuffer: async () => new ArrayBuffer(2),
      }),
    );

    const res = await forwardAttachmentBinary('99', 'preview');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="a.png"');
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });

  it('rejects traversal-like attachment ids', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const res = await forwardAttachmentBinary('..', 'download');
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
