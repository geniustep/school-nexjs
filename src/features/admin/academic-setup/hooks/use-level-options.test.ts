import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enableReferenceLevels } from '../hooks/use-level-options';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      levelsEnable: '/admin/levels/enable',
    },
  },
}));

describe('enableReferenceLevels payload', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      success: true,
      data: {
        results: [{ reference_level_id: 4, status: 'enabled' }],
        summary: { requested: 1, enabled: 1, already_enabled: 0, failed: 0 },
      },
    });
  });

  it('sends create_first_class true when requested', async () => {
    await enableReferenceLevels([4], 1, { createFirstClass: true });
    expect(postMock).toHaveBeenCalledWith(
      '/admin/levels/enable',
      { reference_level_ids: [4], create_first_class: true },
      { active_school_id: 1 },
    );
  });

  it('sends create_first_class false when unchecked', async () => {
    await enableReferenceLevels([4], 1, { createFirstClass: false });
    expect(postMock).toHaveBeenCalledWith(
      '/admin/levels/enable',
      { reference_level_ids: [4], create_first_class: false },
      { active_school_id: 1 },
    );
  });
});
