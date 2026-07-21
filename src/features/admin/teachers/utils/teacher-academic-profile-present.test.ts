import { describe, expect, it } from 'vitest';
import {
  canEditAcademicLimits,
  canEditAcademicProfile,
} from './teacher-domain-allowed-actions';
import {
  countSpecifiedDimensions,
  resolveAcademicCompleteness,
  translateCompletenessWarning,
  translateMismatchReason,
  validateWorkloadDraft,
} from './teacher-academic-profile-present';
import type { TeacherAcademicProfile } from '@/types/teacher-domain';

const t = (key: string) => `tr:${key}`;

describe('teacher academic profile present + allowed actions', () => {
  it('resolves edit permission from edit_eligibility or can_edit_academic_profile', () => {
    expect(canEditAcademicProfile({ edit_eligibility: true })).toBe(true);
    expect(canEditAcademicProfile({ can_edit_academic_profile: true })).toBe(true);
    expect(canEditAcademicProfile({ view: true })).toBe(false);
    expect(canEditAcademicLimits({ edit_limits: true })).toBe(true);
    expect(canEditAcademicLimits({ edit_eligibility: true })).toBe(true);
  });

  it('counts specified dimensions from backend payload only', () => {
    expect(
      countSpecifiedDimensions({
        subjects: { mode: 'specified', count: 2 },
        cycles: { mode: 'unspecified', count: 0 },
        levels: { mode: 'specified', count: 1 },
        teaching_languages: { mode: 'unspecified', count: 0 },
      }),
    ).toBe(2);
  });

  it('keeps completeness blocks_assignment from backend', () => {
    const profile = {
      teacher_id: 1,
      academic_completeness: {
        state: 'partial',
        blocks_assignment: false,
      },
    } as TeacherAcademicProfile;
    expect(resolveAcademicCompleteness(profile)?.blocks_assignment).toBe(false);
  });

  it('maps warning and mismatch codes to i18n keys', () => {
    expect(
      translateCompletenessWarning({ code: 'subjects_unspecified' }, t),
    ).toBe('tr:admin.teacherDomain.academic.warnings.subjectsUnspecified');
    expect(
      translateMismatchReason('assignment_level_outside_declared_eligibility', t),
    ).toBe('tr:admin.teacherDomain.academic.mismatchReasons.levelOutside');
  });

  it('validates workload draft without coercing empty to zero', () => {
    const ok = validateWorkloadDraft({
      weeklyHoursTarget: '',
      weeklyHoursMax: '20',
      dailyHoursMax: '',
      maxContinuousMinutes: '',
    });
    expect(ok).toEqual({
      ok: true,
      payload: {
        weekly_hours_target: null,
        weekly_hours_max: 20,
        daily_hours_max: null,
        max_continuous_minutes: null,
      },
    });

    const bad = validateWorkloadDraft({
      weeklyHoursTarget: '',
      weeklyHoursMax: '10',
      dailyHoursMax: '12',
      maxContinuousMinutes: '',
    });
    expect(bad.ok).toBe(false);
  });
});
