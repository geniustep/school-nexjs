// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EligibleTeachersPicker } from './eligible-teachers-picker';

const { fetchCandidates } = vi.hoisted(() => ({
  fetchCandidates: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/admin/teachers/api/teaching-assignment-eligible-teachers-api', () => ({
  fetchTeachingAssignmentEligibleTeachers: (args: unknown) => fetchCandidates(args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EligibleTeachersPicker review candidates', () => {
  it('loads and shows review candidates by default without making them selectable', async () => {
    fetchCandidates.mockResolvedValue({
      success: true,
      data: {
        candidates: [
          {
            teacher_id: 7,
            display_name: 'أحمد',
            eligibility_state: 'not_eligible',
            blocking_reasons: [{ code: 'teacher_subject_eligibility_unspecified' }],
            warning_reasons: [],
            override_reasons: [],
            can_assign: false,
            eligible: false,
            allowed_actions: {},
          },
        ],
        summary: {
          eligible_count: 0,
          eligible_with_warning_count: 0,
          override_required_count: 0,
          not_eligible_count: 1,
        },
        allowed_actions: {
          can_view_ineligible_candidates: true,
          can_create_assignment: true,
        },
      },
    });

    render(
      <EligibleTeachersPicker
        context={{ class_id: 40, subject_id: 11 } as never}
        selectedTeacherId={null}
        canManage
        onChange={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(fetchCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ include_ineligible: true }),
      ),
    );

    expect(await screen.findByText('أحمد')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /أحمد/ })).toBeNull();
  });
});
