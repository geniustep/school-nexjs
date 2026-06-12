import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSchoolClassDetail, removeSchoolClass } from './use-class-actions';

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
      class: (id: number) => `/admin/classes/${id}`,
      classDelete: (id: number) => `/admin/classes/${id}`,
    },
  },
}));

describe('class actions', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
  });

  it('fetches class detail before removal flow', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: {
        id: 25,
        name: 'P2A',
        can_delete: true,
        can_deactivate: false,
      },
    });

    const res = await fetchSchoolClassDetail(25, 3);
    expect(res.ok).toBe(true);
    expect(getMock).toHaveBeenCalledWith('/admin/classes/25', { active_school_id: 3 });
  });

  it('uses DELETE endpoint without archive fallback', async () => {
    deleteMock.mockResolvedValue({
      success: true,
      data: { action: 'deleted', id: 25 },
    });

    const res = await removeSchoolClass(25, 3);
    expect(res.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith('/admin/classes/25', { active_school_id: 3 });
    expect(deleteMock).not.toHaveBeenCalledWith(expect.stringContaining('/archive'), expect.anything());
  });

  it('maps class_in_use error from delete response', async () => {
    deleteMock.mockResolvedValue({
      success: false,
      error: {
        code: 'class_in_use',
        message: 'This class is currently in use.',
        details: { students: 22, assignments: 8 },
      },
    });

    const res = await removeSchoolClass(25, 3);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('class_in_use');
      expect(res.error.details).toEqual({ students: 22, assignments: 8 });
    }
  });
});
