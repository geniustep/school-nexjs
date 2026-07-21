// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherAcademicProfilePanel } from './teacher-academic-profile-panel';
import type { TeacherAcademicProfile } from '@/types/teacher-domain';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}));

const updateTeacherAcademicProfile = vi.fn();

vi.mock('@/features/admin/teachers/api/teacher-domain-api', () => ({
  updateTeacherAcademicProfile: (...args: unknown[]) => updateTeacherAcademicProfile(...args),
}));

vi.mock('@/features/admin/academic-setup/hooks/use-level-options', () => ({
  useLevelOptions: (active: boolean) =>
    active
      ? {
          options: {
            cycles: [
              { id: 1, code: 'preschool', name: 'التعليم الأولي', sequence: 1 },
              { id: 2, code: 'primary', name: 'التعليم الابتدائي', sequence: 2 },
              { id: 3, code: 'college', name: 'التعليم الإعدادي', sequence: 3 },
            ],
            reference_levels: [],
            permissions: { can_enable: false },
          },
          loading: false,
          error: null,
          reload: vi.fn(),
        }
      : {
          options: null,
          loading: false,
          error: null,
          reload: vi.fn(),
        },
}));

function baseProfile(
  overrides: Partial<TeacherAcademicProfile> = {},
): TeacherAcademicProfile {
  return {
    teacher_id: 9,
    eligibility: {
      specialization: 'فيزياء',
      eligible_subjects: [{ id: 10, name: 'رياضيات' }],
      levels: [{ id: 20, name: 'السنة الأولى' }],
      teaching_languages: [{ id: 30, name: 'العربية' }],
      cycles: [
        { id: 1, name: 'التعليم الأولي' },
        { id: 2, name: 'التعليم الابتدائي' },
      ],
    },
    allowed_actions: { view: true, edit_eligibility: true },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('TeacherAcademicProfilePanel — eligible cycles', () => {
  it('shows current eligible cycles as badges', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    expect(screen.getByText('التعليم الأولي')).toBeTruthy();
    expect(screen.getByText('التعليم الابتدائي')).toBeTruthy();
    expect(screen.getByText('admin.teacherDomain.academic.eligibleCycles')).toBeTruthy();
  });

  it('shows unset state when cycles list is empty', () => {
    render(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          eligibility: {
            specialization: 'فيزياء',
            eligible_subjects: [{ id: 10, name: 'رياضيات' }],
            levels: [{ id: 20, name: 'السنة الأولى' }],
            teaching_languages: [{ id: 30, name: 'العربية' }],
            cycles: [],
          },
        })}
      />,
    );
    expect(
      screen.getByText('admin.teacherDomain.academic.eligibleCyclesUnset'),
    ).toBeTruthy();
    expect(screen.queryByText('غير مؤهل لأي سلك')).toBeNull();
  });

  it('shows edit button only when edit_eligibility is allowed', () => {
    const { rerender } = render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeTruthy();

    rerender(
      <TeacherAcademicProfilePanel
        profile={baseProfile({ allowed_actions: { view: true } })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'common.edit' })).toBeNull();
  });

  it('opens edit mode with current values preselected', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
  });

  it('cancel restores original values without calling API', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(updateTeacherAcademicProfile).not.toHaveBeenCalled();
    expect(screen.getByText('التعليم الأولي')).toBeTruthy();
    expect(screen.getByText('التعليم الابتدائي')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('saves selected cycle ids only and updates UI after success', async () => {
    const onProfileUpdated = vi.fn();
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          specialization: 'فيزياء',
          eligible_subjects: [{ id: 10, name: 'رياضيات' }],
          levels: [{ id: 20, name: 'السنة الأولى' }],
          teaching_languages: [{ id: 30, name: 'العربية' }],
          cycles: [{ id: 2, name: 'التعليم الابتدائي' }, { id: 3, name: 'التعليم الإعدادي' }],
        },
      }),
      meta: {},
    });

    render(
      <TeacherAcademicProfilePanel
        profile={baseProfile()}
        onProfileUpdated={onProfileUpdated}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_cycle_ids: [2, 3],
      });
    });
    expect(onProfileUpdated).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      'admin.teacherDomain.academic.cyclesSaveSuccess',
    );
    expect(screen.getByText('التعليم الابتدائي')).toBeTruthy();
    expect(screen.getByText('التعليم الإعدادي')).toBeTruthy();
    expect(screen.queryByText('التعليم الأولي')).toBeNull();
  });

  it('sends explicit empty array when clearing all cycles', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          specialization: 'فيزياء',
          eligible_subjects: [{ id: 10, name: 'رياضيات' }],
          levels: [{ id: 20, name: 'السنة الأولى' }],
          teaching_languages: [{ id: 30, name: 'العربية' }],
          cycles: [],
        },
      }),
      meta: {},
    });

    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) {
        fireEvent.click(checkbox);
      }
    }
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_cycle_ids: [],
      });
    });
    expect(
      screen.getByText('admin.teacherDomain.academic.eligibleCyclesUnset'),
    ).toBeTruthy();
  });

  it('keeps draft values and shows error on API failure', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: false,
      error: { code: 'forbidden', message: 'denied', details: {} },
      meta: {},
    });

    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect((screen.getAllByRole('checkbox')[2] as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'common.save' })).toBeTruthy();
  });

  it('prevents double submit while saving', async () => {
    let resolveSave: (value: unknown) => void = () => undefined;
    updateTeacherAcademicProfile.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    const saveButton = screen.getByRole('button', { name: 'common.save' });
    fireEvent.click(saveButton);
    fireEvent.click(screen.getByRole('button', { name: 'common.saving' }));

    expect(updateTeacherAcademicProfile).toHaveBeenCalledTimes(1);

    resolveSave({
      success: true,
      data: baseProfile(),
      meta: {},
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'common.saving' })).toBeNull();
    });
  });

  it('does not clear subjects/levels/languages in the payload', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile(),
      meta: {},
    });

    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_cycle_ids: [1, 2],
      });
    });
    const payload = updateTeacherAcademicProfile.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('eligible_subject_ids');
    expect(payload).not.toHaveProperty('eligible_level_ids');
    expect(payload).not.toHaveProperty('teaching_language_ids');
    expect(payload).not.toHaveProperty('specialization');

    expect(screen.getByText('رياضيات')).toBeTruthy();
    expect(screen.getByText('السنة الأولى')).toBeTruthy();
    expect(screen.getByText('العربية')).toBeTruthy();
  });
});
