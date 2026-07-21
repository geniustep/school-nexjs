import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const requireRole = vi.fn(async (_role?: string) => ({
  id: 4706,
  role: 'parent',
  active_role: 'parent',
}));
const serverGet = vi.fn<(path?: string) => Promise<unknown>>();

vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  redirect: (url: string) => redirect(url),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireRole: (role: string) => requireRole(role),
}));

vi.mock('@/lib/api/server', () => ({
  serverGet: (path: string) => serverGet(path),
}));

describe('requireAuthorizedParentChild', () => {
  beforeEach(() => {
    notFound.mockClear();
    redirect.mockClear();
    requireRole.mockClear();
    serverGet.mockReset();
  });

  it('returns child data when Parent API returns 200 for student 857', async () => {
    const { requireAuthorizedParentChild } = await import('@/lib/auth/require-parent-child');
    serverGet.mockResolvedValue({
      success: true,
      data: { id: 857, name: 'غزلان' },
      meta: {},
    });

    const child = await requireAuthorizedParentChild('857');
    expect(requireRole).toHaveBeenCalledWith('parent');
    expect(serverGet).toHaveBeenCalledWith('/parent/children/857');
    expect(child).toMatchObject({ id: 857 });
    expect(notFound).not.toHaveBeenCalled();
  });

  it('maps unauthorized student 1745 (403) to notFound — no student shell', async () => {
    const { requireAuthorizedParentChild } = await import('@/lib/auth/require-parent-child');
    serverGet.mockResolvedValue({
      success: false,
      error: { code: 'forbidden', message: 'denied', details: { status: 403 } },
      meta: {},
    });

    await expect(requireAuthorizedParentChild('1745')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('maps unknown id (404) to notFound', async () => {
    const { requireAuthorizedParentChild } = await import('@/lib/auth/require-parent-child');
    serverGet.mockResolvedValue({
      success: false,
      error: { code: 'not_found', message: 'missing' },
      meta: {},
    });

    await expect(requireAuthorizedParentChild('999999')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('rejects invalid ids without calling Odoo', async () => {
    const { requireAuthorizedParentChild } = await import('@/lib/auth/require-parent-child');
    await expect(requireAuthorizedParentChild('abc')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(serverGet).not.toHaveBeenCalled();
  });

  it('redirects to children list on unexpected API failure', async () => {
    const { requireAuthorizedParentChild } = await import('@/lib/auth/require-parent-child');
    serverGet.mockResolvedValue({
      success: false,
      error: { code: 'server_error', message: 'boom' },
      meta: {},
    });

    await expect(requireAuthorizedParentChild('857')).rejects.toThrow(
      'NEXT_REDIRECT:/parent/children',
    );
    expect(redirect).toHaveBeenCalledWith('/parent/children');
  });
});
