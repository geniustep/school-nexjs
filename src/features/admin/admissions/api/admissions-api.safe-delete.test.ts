import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiDeleteMock = vi.hoisted(() => vi.fn());
const notifyMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', () => ({
  api: {
    delete: (...args: unknown[]) => apiDeleteMock(...args),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../utils/admission-list-invalidate', () => ({
  notifyAdmissionsQueriesInvalidated: (...args: unknown[]) => notifyMock(...args),
}));

vi.mock('../utils/normalize-admission-record', () => ({
  normalizeAdmissionDetail: (v: unknown) => v,
  normalizeAdmissionListItems: (v: unknown) => v,
}));

import { deleteAdmission } from './admissions-api';
import { endpoints } from '@/lib/api/endpoints';

describe('deleteAdmission client', () => {
  beforeEach(() => {
    apiDeleteMock.mockReset();
    notifyMock.mockReset();
  });

  it('sends DELETE to admission path with active_school_id', async () => {
    apiDeleteMock.mockResolvedValue({
      success: true,
      data: { deleted: true, id: 62 },
      meta: {},
    });

    const res = await deleteAdmission(62, { active_school_id: 3 });

    expect(apiDeleteMock).toHaveBeenCalledTimes(1);
    expect(apiDeleteMock).toHaveBeenCalledWith(endpoints.admin.admission(62), {
      active_school_id: 3,
    });
    expect(res.success).toBe(true);
    expect(notifyMock).toHaveBeenCalledWith({ reason: 'delete', admissionId: 62 });
  });

  it('does not invalidate on failure', async () => {
    apiDeleteMock.mockResolvedValue({
      success: false,
      error: { code: 'forbidden', message: 'no', details: { status: 403 } },
      meta: {},
    });

    const res = await deleteAdmission(62, { active_school_id: 3 });
    expect(res.success).toBe(false);
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
