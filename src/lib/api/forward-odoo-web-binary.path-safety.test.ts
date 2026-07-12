import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('forwardOdooWebBinary path safety', () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards safe image paths under /web/image/', async () => {
    const res = await forwardOdooWebBinary(['image', 'school.student', '854', 'image_128']);
    expect(res.status).toBe(200);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toBe('https://api-school.example/web/image/school.student/854/image_128');
    expect(new URL(url).pathname.startsWith('/web/image/')).toBe(true);
  });

  it('rejects traversal and non-image namespaces without calling fetch', async () => {
    for (const segments of [
      ['image', '..', '..', 'dataset'],
      ['image', '%2e%2e', 'dataset'],
      ['dataset', 'call_kw'],
      ['web', 'session'],
      ['image', 'school.student', '..', 'session'],
    ]) {
      vi.mocked(fetch).mockClear();
      const res = await forwardOdooWebBinary(segments);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(fetch).not.toHaveBeenCalled();
    }
  });
});
