import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/config', () => ({
  config: {
    odooBaseUrl: 'https://odoo.test',
    odooDb: 'school',
    apiPrefix: '/api/v1',
    sessionCookieName: 'scc_session',
    tenantCookieName: 'scc_tenant',
  },
}));

vi.mock('@/lib/api/odoo-backend', () => ({
  getStoredTenantSlug: vi.fn(async () => null),
  resolveOdooBaseUrlForTenant: vi.fn(),
}));

vi.mock('@/lib/tenant', () => ({
  resolveServerRequestHost: vi.fn(async () => null),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => new Headers()),
}));

import { odooApiFetch } from './odoo-server';

function jsonResponse(body: unknown, status = 200) {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => text,
    json: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

describe('odooApiFetch activeRole transport', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ success: true, data: { user: { id: 1 } }, meta: {} }),
      ),
    );
  });

  it('omits X-SSC-Active-Role when activeRole is absent (prior behavior)', async () => {
    await odooApiFetch('/me', { method: 'GET', sessionId: 'sess-a' });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-SSC-Active-Role']).toBeUndefined();
    expect(headers.Cookie).toBe('session_id=sess-a');
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.cache).toBe('no-store');
  });

  it('sends a single teacher header when activeRole=teacher', async () => {
    await odooApiFetch('/me', {
      method: 'GET',
      sessionId: 'sess-a',
      activeRole: 'teacher',
    });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-SSC-Active-Role']).toBe('teacher');
    expect(Object.keys(headers).filter((k) => k.toLowerCase().includes('role'))).toEqual([
      'X-SSC-Active-Role',
    ]);
  });

  it('sends a single parent header when activeRole=parent', async () => {
    await odooApiFetch('/teacher/today', {
      method: 'GET',
      sessionId: 'sess-a',
      activeRole: 'parent',
    });
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-SSC-Active-Role']).toBe('parent');
  });

  it('preserves session cookie and no-store with activeRole', async () => {
    await odooApiFetch('/me', {
      method: 'GET',
      sessionId: 'cookie-xyz',
      activeRole: 'admin',
    });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Cookie).toBe('session_id=cookie-xyz');
    expect(init.cache).toBe('no-store');
  });

  it('normalizes mixed-case activeRole before send', async () => {
    await odooApiFetch('/me', {
      method: 'GET',
      sessionId: 'sess-a',
      activeRole: ' Teacher ',
    });
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-SSC-Active-Role']).toBe('teacher');
  });

  it('sequential calls with different roles do not stick', async () => {
    await odooApiFetch('/me', { sessionId: 's1', activeRole: 'teacher' });
    await odooApiFetch('/me', { sessionId: 's1', activeRole: 'admin' });
    await odooApiFetch('/me', { sessionId: 's1' });

    const roles = vi.mocked(fetch).mock.calls.map((c) => {
      const h = (c[1] as RequestInit).headers as Record<string, string>;
      return h['X-SSC-Active-Role'];
    });
    expect(roles).toEqual(['teacher', 'admin', undefined]);
  });

  it('concurrent calls with different roles stay isolated', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (_url, init) => {
      await new Promise((r) => setTimeout(r, 5));
      return jsonResponse({
        success: true,
        data: {
          role: (init?.headers as Record<string, string>)?.['X-SSC-Active-Role'] ?? 'default',
        },
        meta: {},
      }) as unknown as Response;
    });

    const [a, b] = await Promise.all([
      odooApiFetch<{ role: string }>('/me', { sessionId: 'u1', activeRole: 'teacher' }),
      odooApiFetch<{ role: string }>('/me', { sessionId: 'u1', activeRole: 'admin' }),
    ]);

    expect(a.kind).toBe('json');
    expect(b.kind).toBe('json');
    if (a.kind === 'json' && b.kind === 'json' && a.body.success && b.body.success) {
      expect(a.body.data.role).toBe('teacher');
      expect(b.body.data.role).toBe('admin');
    }

    const sent = fetchMock.mock.calls.map(
      (c) => ((c[1] as RequestInit).headers as Record<string, string>)['X-SSC-Active-Role'],
    );
    expect(sent.sort()).toEqual(['admin', 'teacher']);
  });

  it('two users with different sessions do not leak roles', async () => {
    await Promise.all([
      odooApiFetch('/me', { sessionId: 'user-A', activeRole: 'teacher' }),
      odooApiFetch('/me', { sessionId: 'user-B', activeRole: 'parent' }),
    ]);
    const pairs = vi.mocked(fetch).mock.calls.map((c) => {
      const h = (c[1] as RequestInit).headers as Record<string, string>;
      return { cookie: h.Cookie, role: h['X-SSC-Active-Role'] };
    });
    expect(pairs).toEqual(
      expect.arrayContaining([
        { cookie: 'session_id=user-A', role: 'teacher' },
        { cookie: 'session_id=user-B', role: 'parent' },
      ]),
    );
  });

  it('does not forward arbitrary inbound headers (only Cookie/Content-Type/role)', async () => {
    await odooApiFetch('/me', {
      sessionId: 'sess',
      activeRole: 'student',
      ...(
        { headers: { Authorization: 'secret', 'X-Evil': '1' } } as Record<string, unknown>
      ),
    });
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Evil']).toBeUndefined();
    expect(Object.keys(headers).sort()).toEqual([
      'Content-Type',
      'Cookie',
      'X-SSC-Active-Role',
    ]);
  });
});
