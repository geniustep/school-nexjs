import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSchoolLevelDetail, removeSchoolLevel } from './use-level-actions';

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      level: (id: number) => `/admin/levels/${id}`,
      levelDelete: (id: number) => `/admin/levels/${id}`,
    },
  },
}));

describe('level actions', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
  });

  it('fetches level detail before removal flow', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: { id: 10, name: 'P1', can_delete: true },
    });

    const res = await fetchSchoolLevelDetail(10, 3);
    expect(res.ok).toBe(true);
    expect(getMock).toHaveBeenCalledWith('/admin/levels/10', { active_school_id: 3 });
  });

  it('uses DELETE endpoint only', async () => {
    deleteMock.mockResolvedValue({
      success: true,
      data: { action: 'deleted', id: 10 },
    });

    const res = await removeSchoolLevel(10, 3);
    expect(res.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith('/admin/levels/10', { active_school_id: 3 });
  });
});
