// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherAcademicProfilePanel } from './teacher-academic-profile-panel';
import type { TeacherAcademicProfile } from '@/types/teacher-domain';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    return `${key}:${JSON.stringify(params)}`;
  },
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

vi.mock('@/features/admin/academic-setup/hooks/use-teacher-options', () => ({
  useTeacherOptions: (active: boolean) =>
    active
      ? {
          options: {
            teacherTypes: [
              { value: 'permanent', label: 'دائم' },
              { value: 'vacataire', label: 'عرضي' },
            ],
            qualifications: [],
            contractTypes: [],
            statuses: [],
            genders: [],
            schools: [],
            defaults: {},
            constraints: { specialization: { max: 80 } },
          },
          loading: false,
          error: null,
          reload: vi.fn(),
        }
      : { options: null, loading: false, error: null, reload: vi.fn() },
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: (path: string | null) => {
    if (!path) return { data: null, loading: false, error: null, reload: vi.fn() };
    if (String(path).includes('/subjects')) {
      return {
        data: [
          { id: 10, name: 'رياضيات', active: true },
          { id: 11, name: 'فيزياء', active: true },
        ],
        loading: false,
        error: null,
        reload: vi.fn(),
      };
    }
    if (String(path).includes('/levels')) {
      return {
        data: [
          { id: 20, name: 'السنة الأولى', active: true, cycle: { id: 2, name: 'التعليم الابتدائي' } },
          { id: 21, name: 'السنة الثانية', active: true, cycle: { id: 2, name: 'التعليم الابتدائي' } },
        ],
        loading: false,
        error: null,
        reload: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, reload: vi.fn() };
  },
}));

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAdminAcademicContextOptions: vi.fn(async () => ({
    success: true,
    data: {
      teaching_languages: [
        { id: 30, name: 'العربية', code: 'ar_001' },
        { id: 31, name: 'الفرنسية', code: 'fr_FR' },
      ],
    },
    meta: {},
  })),
}));

function baseProfile(
  overrides: Partial<TeacherAcademicProfile> = {},
): TeacherAcademicProfile {
  return {
    teacher_id: 9,
    specialization: 'فيزياء',
    teacher_type: 'permanent',
    eligibility: {
      specialization: 'فيزياء',
      teacher_type: 'permanent',
      eligible_subjects: [{ id: 10, name: 'رياضيات' }],
      levels: [{ id: 20, name: 'السنة الأولى' }],
      teaching_languages: [{ id: 30, name: 'العربية' }],
      cycles: [
        { id: 1, name: 'التعليم الأولي' },
        { id: 2, name: 'التعليم الابتدائي' },
      ],
      eligible_as_head_teacher: false,
      eligible_as_subject_coordinator: false,
      eligible_as_level_coordinator: false,
    },
    eligibility_dimensions: {
      subjects: { mode: 'specified', count: 1 },
      cycles: { mode: 'specified', count: 2 },
      levels: { mode: 'specified', count: 1 },
      teaching_languages: { mode: 'specified', count: 1 },
    },
    academic_completeness: {
      state: 'partial',
      subjects_specified: true,
      stage_or_level_specified: true,
      teaching_languages_specified: true,
      weekly_limit_specified: false,
      blocks_assignment: false,
    },
    completeness_warnings: [
      { code: 'weekly_limit_unspecified', message: 'Weekly limit unspecified' },
      { code: 'academic_profile_incomplete', message: 'Incomplete' },
    ],
    limits: {
      weekly_hours_target: 18,
      weekly_hours_max: 24,
      daily_hours_max: null,
      max_continuous_minutes: 90,
    },
    assignment_mismatch_summary: { count: 0, warnings: [] },
    allowed_actions: {
      view: true,
      edit_eligibility: true,
      can_edit_academic_profile: true,
      edit_limits: true,
    },
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
    expect(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    ).toBeTruthy();

    rerender(
      <TeacherAcademicProfilePanel
        profile={baseProfile({ allowed_actions: { view: true } })}
      />,
    );
    expect(
      screen.queryByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    ).toBeNull();
  });

  it('opens edit mode with current values preselected', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
  });

  it('cancel restores original values without calling API', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );

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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );

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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );
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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );
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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );
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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleCycles',
      }),
    );
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

describe('TeacherAcademicProfilePanel — contract 238 surfaces', () => {
  it('renders completeness states from backend', () => {
    const { rerender } = render(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          academic_completeness: {
            state: 'unconfigured',
            blocks_assignment: false,
          },
        })}
      />,
    );
    expect(
      screen.getByText('admin.teacherDomain.academic.completeness.unconfigured'),
    ).toBeTruthy();

    rerender(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          academic_completeness: { state: 'partial', blocks_assignment: false },
        })}
      />,
    );
    expect(
      screen.getByText('admin.teacherDomain.academic.completeness.partial'),
    ).toBeTruthy();

    rerender(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          academic_completeness: { state: 'complete', blocks_assignment: false },
          completeness_warnings: [],
        })}
      />,
    );
    expect(
      screen.getByText('admin.teacherDomain.academic.completeness.complete'),
    ).toBeTruthy();
  });

  it('shows translated completeness warnings as warnings not errors', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    expect(
      screen.getByText('admin.teacherDomain.academic.warnings.weeklyLimitUnspecified'),
    ).toBeTruthy();
    expect(
      screen.getByText('admin.teacherDomain.academic.warnings.profileIncomplete'),
    ).toBeTruthy();
    expect(screen.getAllByText('admin.teacherDomain.academic.warningBadge').length).toBeGreaterThan(
      0,
    );
  });

  it('hides edit controls for view-only users including can_edit alias absence', () => {
    render(
      <TeacherAcademicProfilePanel
        profile={baseProfile({ allowed_actions: { view: true, can_view: true } })}
      />,
    );
    expect(
      screen.queryByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleSubjects',
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'admin.teacherDomain.academic.editLimits' }),
    ).toBeNull();
  });

  it('allows editing when only can_edit_academic_profile is true', () => {
    render(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          allowed_actions: { view: true, can_edit_academic_profile: true },
        })}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleSubjects',
      }),
    ).toBeTruthy();
  });

  it('patches specialization only', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({ specialization: 'كيمياء' }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.teacherDomain.academic.editIdentity' }),
    );
    fireEvent.change(screen.getByDisplayValue('فيزياء'), {
      target: { value: 'كيمياء' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        specialization: 'كيمياء',
        teacher_type: 'permanent',
      });
    });
  });

  it('patches eligible subjects only and supports empty array', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          eligible_subjects: [],
          cycles: [{ id: 1, name: 'التعليم الأولي' }],
          levels: [{ id: 20, name: 'السنة الأولى' }],
          teaching_languages: [{ id: 30, name: 'العربية' }],
        },
      }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleSubjects',
      }),
    );
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_subject_ids: [],
      });
    });
    expect(
      screen.getByText('admin.teacherDomain.academic.eligibleSubjectsUnset'),
    ).toBeTruthy();
  });

  it('patches eligible levels only', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          eligible_subjects: [{ id: 10, name: 'رياضيات' }],
          cycles: [{ id: 2, name: 'التعليم الابتدائي' }],
          levels: [{ id: 21, name: 'السنة الثانية' }],
          teaching_languages: [{ id: 30, name: 'العربية' }],
        },
      }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editEligibleLevels',
      }),
    );
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_level_ids: [21],
      });
    });
  });

  it('patches teaching languages only', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          eligible_subjects: [{ id: 10, name: 'رياضيات' }],
          cycles: [{ id: 1, name: 'التعليم الأولي' }],
          levels: [{ id: 20, name: 'السنة الأولى' }],
          teaching_languages: [{ id: 31, name: 'الفرنسية' }],
        },
      }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'admin.teacherDomain.academic.editTeachingLanguages',
      }),
    );
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        teaching_language_ids: [31],
      });
    });
  });

  it('patches workload limits and keeps null instead of zero for empty fields', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        limits: {
          weekly_hours_target: null,
          weekly_hours_max: 20,
          daily_hours_max: null,
          max_continuous_minutes: null,
        },
      }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.teacherDomain.academic.editLimits' }),
    );
    fireEvent.change(screen.getByDisplayValue('18'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('24'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        weekly_hours_target: null,
        weekly_hours_max: 20,
        daily_hours_max: null,
        max_continuous_minutes: 90,
        prefer_compact_schedule: false,
      });
    });
  });

  it('patches academic role flags only', async () => {
    updateTeacherAcademicProfile.mockResolvedValue({
      success: true,
      data: baseProfile({
        eligibility: {
          ...baseProfile().eligibility,
          eligible_as_head_teacher: true,
        },
      }),
      meta: {},
    });
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.teacherDomain.academic.editRoles' }),
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(updateTeacherAcademicProfile).toHaveBeenCalledWith(9, {
        eligible_as_head_teacher: true,
        eligible_as_subject_coordinator: false,
        eligible_as_level_coordinator: false,
      });
    });
  });

  it('shows mismatch summary when count > 0 without mutation controls', () => {
    render(
      <TeacherAcademicProfilePanel
        profile={baseProfile({
          assignment_mismatch_summary: {
            count: 1,
            warnings: [
              {
                assignment_id: 77,
                reason_code: 'assignment_subject_outside_declared_eligibility',
                reason_codes: ['assignment_subject_outside_declared_eligibility'],
              },
            ],
            mutates_assignment: false,
          },
          current_assignments: [
            {
              id: 77,
              subject: { id: 1, name: 'عربية' },
              class: { id: 2, name: '1APIC' },
              state: 'active',
            },
          ],
        })}
      />,
    );
    expect(screen.getByText('admin.teacherDomain.academic.mismatchTitle')).toBeTruthy();
    expect(screen.getByText(/mismatchAlert/)).toBeTruthy();
    expect(screen.getByText('عربية')).toBeTruthy();
    expect(screen.getByText('1APIC')).toBeTruthy();
    expect(
      screen.getByText('admin.teacherDomain.academic.mismatchReasons.subjectOutside'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /end|suspend|activate/i })).toBeNull();
  });

  it('does not show mismatch card when count is 0', () => {
    render(<TeacherAcademicProfilePanel profile={baseProfile()} />);
    expect(screen.queryByText('admin.teacherDomain.academic.mismatchTitle')).toBeNull();
  });
});
