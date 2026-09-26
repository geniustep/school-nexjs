import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { post: mocks.post } }));

import { correctStudentAcademicPlacement } from './student-academic-placement-api';

describe('student academic placement API', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ success: true, data: {} });
  });

  it('posts only level_id to the governed correction endpoint', async () => {
    await correctStudentAcademicPlacement(42, { level_id: 9 });
    expect(mocks.post).toHaveBeenCalledWith(
      '/admin/students/42/academic-placement/correct',
      { level_id: 9 },
    );
  });
});
