import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deactivateStaffMember, reactivateStaffMember } from './use-staff';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      staffDeactivate: (id: number) => `/admin/staff/${id}/deactivate`,
      staffReactivate: (id: number) => `/admin/staff/${id}/reactivate`,
    },
  },
}));

describe('staff mutations', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('POST reactivate without body payload fields', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        action: 'reactivated',
        item: { id: 42, active: true, can_reactivate: false, can_deactivate: true },
        account: { status: 'active', login: 'staff@example.com' },
        warnings: [],
      },
    });

    const res = await reactivateStaffMember(42);
    expect(res.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith('/admin/staff/42/reactivate', {});
  });

  it('POST deactivate with empty object body', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: { action: 'deactivated', item: { id: 42, active: false } },
    });

    const res = await deactivateStaffMember(42);
    expect(res.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith('/admin/staff/42/deactivate', {});
  });

  it('handles already_active idempotent response', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: { action: 'already_active', item: { id: 42, active: true } },
    });

    const res = await reactivateStaffMember(42);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.action).toBe('already_active');
    }
  });
});
