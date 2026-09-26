import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { post: mocks.post } }));

import {
  correctStudentAcademicPlacement,
  previewStudentAcademicPlacementFinanceTransition,
} from './student-academic-placement-api';

describe('student academic placement API', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ success: true, data: {} });
  });

  it('posts only level_id for the ordinary governed correction path', async () => {
    await correctStudentAcademicPlacement(42, { level_id: 9 });
    expect(mocks.post).toHaveBeenCalledWith(
      '/admin/students/42/academic-placement/correct',
      { level_id: 9 },
    );
  });

  it('requests carry-forward preview without selecting a finance plan client-side', async () => {
    await previewStudentAcademicPlacementFinanceTransition(42, {
      mode: 'carry_forward_plan_change',
      level_id: 9,
      academic_year_id: 3,
    });
    expect(mocks.post).toHaveBeenCalledWith(
      '/admin/students/42/finance/change-plan/preview',
      {
        mode: 'carry_forward_plan_change',
        level_id: 9,
        academic_year_id: 3,
      },
    );
  });

  it('posts the exact atomic confirmation body to academic placement', async () => {
    await correctStudentAcademicPlacement(42, {
      level_id: 9,
      confirm_finance_transition: true,
      preview_token: 'preview-sha',
    });
    expect(mocks.post).toHaveBeenCalledWith(
      '/admin/students/42/academic-placement/correct',
      {
        level_id: 9,
        confirm_finance_transition: true,
        preview_token: 'preview-sha',
      },
    );
  });
});
