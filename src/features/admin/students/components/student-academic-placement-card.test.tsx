/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentEnrollment, StudentLevelOption } from '@/types/student-360';

const mocks = vi.hoisted(() => ({
  correct: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: mocks.success,
    error: mocks.error,
    warning: vi.fn(),
    show: vi.fn(),
  }),
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void | Promise<void>;
  }) => (open ? (
    <button type="button" onClick={() => void onConfirm()}>
      placement-confirm
    </button>
  ) : null),
}));

vi.mock('../api/student-academic-placement-api', () => ({
  correctStudentAcademicPlacement: mocks.correct,
}));

import { StudentAcademicPlacementCard } from './student-academic-placement-card';

const levels: StudentLevelOption[] = [
  { id: 1, name: 'Primary 1', cycle: { code: 'primary' } },
  { id: 2, name: 'Primary 2', cycle: { code: 'primary' } },
  { id: 3, name: 'Middle 1', cycle: { code: 'middle_school' } },
];

const enrollment: StudentEnrollment = {
  id: 10,
  state: 'active',
  level: levels[0],
  class: { id: 7, name: 'Class A' },
};

function successData(level: StudentLevelOption, cls: StudentEnrollment['class']) {
  return {
    student: { id: 42, first_name: 'Student', last_name: 'One', status: 'active' },
    current_enrollment: { ...enrollment, level, class: cls },
    enrollment_history: [],
    guardian_relationships: [],
    capabilities: { can_manage: true, can_manage_guardians: false, can_view_finance: false },
  };
}

describe('StudentAcademicPlacementCard', () => {
  beforeEach(() => {
    mocks.correct.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
  });

  afterEach(() => cleanup());

  it('initializes from current_enrollment and filters levels by Backend cycle.code', () => {
    render(
      <StudentAcademicPlacementCard
        studentId={42}
        enrollment={enrollment}
        levels={levels}
        optionsLoading={false}
        canManage
      />,
    );

    const cycle = screen.getByLabelText('admin.student360.editPage.academicPlacement.cycle') as HTMLSelectElement;
    const level = screen.getByLabelText('admin.student360.editPage.academicPlacement.level') as HTMLSelectElement;
    expect(cycle.value).toBe('primary');
    expect(level.value).toBe('1');
    expect(Array.from(level.options).map((option) => option.value)).toEqual(['', '1', '2']);
  });

  it('clears an incompatible level when cycle changes and keeps no-op disabled', () => {
    render(
      <StudentAcademicPlacementCard
        studentId={42}
        enrollment={enrollment}
        levels={levels}
        optionsLoading={false}
        canManage
      />,
    );

    const cycle = screen.getByLabelText('admin.student360.editPage.academicPlacement.cycle') as HTMLSelectElement;
    const level = screen.getByLabelText('admin.student360.editPage.academicPlacement.level') as HTMLSelectElement;
    const save = screen.getByRole('button', { name: 'admin.student360.editPage.academicPlacement.update' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(cycle, { target: { value: 'middle_school' } });
    expect(level.value).toBe('');
    expect(mocks.correct).not.toHaveBeenCalled();
  });

  it('confirms class unassign, sends only level_id, and reflects final Backend state', async () => {
    mocks.correct.mockResolvedValue({
      success: true,
      data: successData(levels[2], null),
    });
    const updated = vi.fn();

    render(
      <StudentAcademicPlacementCard
        studentId={42}
        enrollment={enrollment}
        levels={levels}
        optionsLoading={false}
        canManage
        onUpdated={updated}
      />,
    );

    fireEvent.change(
      screen.getByLabelText('admin.student360.editPage.academicPlacement.cycle'),
      { target: { value: 'middle_school' } },
    );
    fireEvent.change(
      screen.getByLabelText('admin.student360.editPage.academicPlacement.level'),
      { target: { value: '3' } },
    );

    expect(screen.getByText('admin.student360.editPage.academicPlacement.classWarningTitle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'admin.student360.editPage.academicPlacement.update' }));
    expect(mocks.correct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'placement-confirm' }));
    await waitFor(() => expect(mocks.correct).toHaveBeenCalledWith(42, { level_id: 3 }));
    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
    expect(screen.getByText('admin.student360.editPage.academicPlacement.unassigned')).toBeTruthy();
  });

  it('shows the finance blocker without optimistic success state', async () => {
    mocks.correct.mockResolvedValue({
      success: false,
      error: {
        code: 'finance_review_required',
        message: 'blocked',
        details: {
          finance_review_reasons: ['target_level_not_covered_by_fee_plan'],
        },
      },
      meta: {},
    });

    render(
      <StudentAcademicPlacementCard
        studentId={42}
        enrollment={{ ...enrollment, class: null }}
        levels={levels}
        optionsLoading={false}
        canManage
      />,
    );

    fireEvent.change(
      screen.getByLabelText('admin.student360.editPage.academicPlacement.level'),
      { target: { value: '2' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.student360.editPage.academicPlacement.update' }));

    await waitFor(() => expect(mocks.correct).toHaveBeenCalledWith(42, { level_id: 2 }));
    expect(
      screen.getByText(
        'admin.student360.editPage.academicPlacement.errors.targetLevelNotCoveredByFeePlan',
      ),
    ).toBeTruthy();
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
