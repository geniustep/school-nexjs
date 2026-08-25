import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticateOdoo, authenticateRaqeem } from './odoo-server';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Odoo authentication transports', () => {
  it('sends Raqeem app login through /api/v1/auth/login without client phone normalization', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: { user: { id: 9617 } },
          meta: {},
        }),
        {
          status: 200,
          headers: { 'set-cookie': 'session_id=raqeem-session; Path=/; HttpOnly' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await authenticateRaqeem(
      'school',
      '0661339892',
      'test-password',
      'https://school-backend.example.test',
    );

    expect(result).toEqual({
      ok: true,
      sessionId: 'raqeem-session',
      uid: 9617,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://school-backend.example.test/api/v1/auth/login?db=school');
    expect(url).not.toContain('/web/session/authenticate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      login: '0661339892',
      password: 'test-password',
    });
  });

  it('preserves the legacy Odoo-native /web/session/authenticate transport', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ result: { uid: 42 } }),
        {
          status: 200,
          headers: { 'set-cookie': 'session_id=legacy-session; Path=/; HttpOnly' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await authenticateOdoo(
      'school',
      'technical.login',
      'test-password',
      'https://school-backend.example.test',
    );

    expect(result).toEqual({
      ok: true,
      sessionId: 'legacy-session',
      uid: 42,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://school-backend.example.test/web/session/authenticate');
    expect(JSON.parse(String(init.body))).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'call',
      params: {
        db: 'school',
        login: 'technical.login',
        password: 'test-password',
      },
    });
  });
});
