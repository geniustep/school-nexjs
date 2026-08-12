import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { reactivateTeacher } from './teacher-domain-api';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('teacher membership restart API', () => {
  it('posts effective_from to the canonical reactivate endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: { item: { id: 9, name: 'A', code: null, status: 'active' } },
      meta: { membership_restart: true },
    });

    const result = await reactivateTeacher(9, { effective_from: '2026-09-01' });

    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.admin.teacherReactivate(9),
      { effective_from: '2026-09-01' },
      undefined,
    );
    expect(result.success).toBe(true);
  });

  it('keeps legacy reactivate payload-less', async () => {
    mockApi.post.mockResolvedValueOnce({
      success: true,
      data: { item: { id: 9, name: 'A', code: null, status: 'active' } },
      meta: {},
    });

    await reactivateTeacher(9);

    expect(mockApi.post).toHaveBeenCalledWith(
      endpoints.admin.teacherReactivate(9),
      undefined,
      undefined,
    );
  });
});
