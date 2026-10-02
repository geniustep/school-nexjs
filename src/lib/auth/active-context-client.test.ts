import { describe, expect, it, vi } from 'vitest';
import { ActiveContextSwitchError, switchActiveContext } from '@/lib/auth/active-context-client';

const requested = { school_id: 2, role: 'parent' as const };
const user = {
  id: 7,
  name: 'QA User',
  email: null,
  role: 'parent' as const,
  active_role: 'parent',
  active_context: requested,
  permissions: [],
  school: { id: 2, name: 'School B' },
};

describe('switchActiveContext', () => {
  it('sends exactly one atomic POST and accepts the server-confirmed user', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      success: true,
      data: { user, active_context: requested, home: '/parent/dashboard' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const result = await switchActiveContext(requested, fetchImpl as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/auth/active-context');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(requested);
    expect(result.user.active_context).toEqual(requested);
    expect(result.home).toBe('/parent/dashboard');
  });

  it('does not accept optimistic/mismatched server state', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      success: true,
      data: { user: { ...user, active_context: { school_id: 1, role: 'admin' } } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(switchActiveContext(requested, fetchImpl as typeof fetch)).rejects.toMatchObject({
      code: 'context_not_confirmed',
    });
  });

  it('preserves context_not_available for UI error mapping', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      success: false,
      error: { code: 'context_not_available', message: 'Denied' },
    }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(switchActiveContext(requested, fetchImpl as typeof fetch)).rejects.toEqual(
      expect.objectContaining<Partial<ActiveContextSwitchError>>({ code: 'context_not_available' }),
    );
  });
});
