import type {
  AcademicCompleteness,
  AcademicCompletenessState,
  AcademicCompletenessWarning,
  AssignmentMismatchSummary,
  AssignmentMismatchWarning,
  EligibilityDimensionMode,
  EligibilityDimensionSummary,
  TeacherAcademicEligibility,
  TeacherAcademicProfile,
  TeacherEligibilityDimensions,
  TeacherEligibleLevelRef,
  TeacherEligibleSubjectRef,
} from '@/types/teacher-domain';

const COMPLETENESS_WARNING_KEYS: Record<string, string> = {
  subjects_unspecified: 'admin.teacherDomain.academic.warnings.subjectsUnspecified',
  cycles_unspecified: 'admin.teacherDomain.academic.warnings.cyclesUnspecified',
  levels_unspecified: 'admin.teacherDomain.academic.warnings.levelsUnspecified',
  teaching_languages_unspecified:
    'admin.teacherDomain.academic.warnings.teachingLanguagesUnspecified',
  weekly_limit_unspecified: 'admin.teacherDomain.academic.warnings.weeklyLimitUnspecified',
  academic_profile_incomplete: 'admin.teacherDomain.academic.warnings.profileIncomplete',
};

const MISMATCH_REASON_KEYS: Record<string, string> = {
  assignment_subject_outside_declared_eligibility:
    'admin.teacherDomain.academic.mismatchReasons.subjectOutside',
  assignment_level_outside_declared_eligibility:
    'admin.teacherDomain.academic.mismatchReasons.levelOutside',
  assignment_cycle_outside_declared_eligibility:
    'admin.teacherDomain.academic.mismatchReasons.cycleOutside',
  assignment_language_outside_declared_eligibility:
    'admin.teacherDomain.academic.mismatchReasons.languageOutside',
  subject_not_in_eligibility: 'admin.teacherDomain.academic.mismatchReasons.subjectOutside',
  level_not_in_eligibility: 'admin.teacherDomain.academic.mismatchReasons.levelOutside',
  cycle_not_in_eligibility: 'admin.teacherDomain.academic.mismatchReasons.cycleOutside',
  language_not_in_eligibility: 'admin.teacherDomain.academic.mismatchReasons.languageOutside',
  eligibility_assignment_mismatch:
    'admin.teacherDomain.academic.mismatchReasons.genericMismatch',
};

const COMPLETENESS_STATE_KEYS: Record<AcademicCompletenessState, string> = {
  unconfigured: 'admin.teacherDomain.academic.completeness.unconfigured',
  partial: 'admin.teacherDomain.academic.completeness.partial',
  complete: 'admin.teacherDomain.academic.completeness.complete',
};

export function asDimensionMode(raw: unknown): EligibilityDimensionMode | null {
  if (raw === 'specified' || raw === 'unspecified') return raw;
  return null;
}

export function resolveEligibilityDimensions(
  profile: TeacherAcademicProfile,
): TeacherEligibilityDimensions | null {
  const dims = profile.eligibility_dimensions ?? profile.eligibility?.eligibility_dimensions;
  if (!dims || typeof dims !== 'object') return null;
  return dims;
}

export function resolveAcademicCompleteness(
  profile: TeacherAcademicProfile,
): AcademicCompleteness | null {
  const raw = profile.academic_completeness;
  if (!raw || typeof raw !== 'object') return null;
  const state = raw.state;
  if (state !== 'unconfigured' && state !== 'partial' && state !== 'complete') return null;
  return {
    ...raw,
    state,
    blocks_assignment: Boolean(raw.blocks_assignment),
  };
}

export function countSpecifiedDimensions(dims: TeacherEligibilityDimensions | null): number {
  if (!dims) return 0;
  let count = 0;
  for (const key of ['subjects', 'cycles', 'levels', 'teaching_languages'] as const) {
    if (dims[key]?.mode === 'specified') count += 1;
  }
  return count;
}

export function dimensionSummary(
  dims: TeacherEligibilityDimensions | null,
  key: keyof TeacherEligibilityDimensions,
): EligibilityDimensionSummary | null {
  const row = dims?.[key];
  if (!row) return null;
  const mode = asDimensionMode(row.mode) ?? asDimensionMode(row.status);
  if (!mode) return null;
  return {
    mode,
    count: Number(row.count) || 0,
    status: asDimensionMode(row.status) ?? mode,
  };
}

export function eligibleSubjectsFromProfile(
  eligibility: TeacherAcademicEligibility | undefined,
): TeacherEligibleSubjectRef[] {
  return eligibility?.eligible_subjects ?? eligibility?.subjects ?? [];
}

export function eligibleLevelsFromProfile(
  eligibility: TeacherAcademicEligibility | undefined,
): TeacherEligibleLevelRef[] {
  return eligibility?.levels ?? [];
}

export function completenessStateLabelKey(state: AcademicCompletenessState): string {
  return COMPLETENESS_STATE_KEYS[state];
}

export function completenessWarningLabelKey(code: string | null | undefined): string | null {
  if (!code) return null;
  return COMPLETENESS_WARNING_KEYS[code] ?? null;
}

export function translateCompletenessWarning(
  warning: AcademicCompletenessWarning,
  t: (key: string) => string,
): string {
  const key = completenessWarningLabelKey(warning.code);
  if (key) return t(key);
  return warning.message?.trim() || warning.code;
}

export function mismatchReasonLabelKey(code: string | null | undefined): string | null {
  if (!code) return null;
  return MISMATCH_REASON_KEYS[code] ?? null;
}

export function translateMismatchReason(
  code: string | null | undefined,
  t: (key: string) => string,
): string {
  const key = mismatchReasonLabelKey(code);
  if (key) return t(key);
  return code?.trim() || t('admin.teacherDomain.academic.mismatchReasons.genericMismatch');
}

export function resolveAssignmentMismatchSummary(
  profile: TeacherAcademicProfile,
): AssignmentMismatchSummary | null {
  const raw = profile.assignment_mismatch_summary;
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    count: Number(raw.count) || 0,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
}

export function enrichMismatchWithAssignment(
  warning: AssignmentMismatchWarning,
  profile: TeacherAcademicProfile,
): {
  warning: AssignmentMismatchWarning;
  subjectName: string | null;
  className: string | null;
  state: string | null;
} {
  const id = warning.assignment_id;
  const assignments =
    profile.operational_derived?.current_assignments ?? profile.current_assignments ?? [];
  const match =
    id != null ? assignments.find((row) => Number(row.id) === Number(id)) : undefined;
  return {
    warning,
    subjectName: match?.subject?.name ?? null,
    className: match?.class?.name ?? null,
    state: match?.state ?? null,
  };
}

export function parseOptionalNonNegativeNumber(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return { ok: false };
  return { ok: true, value };
}

export function validateWorkloadDraft(input: {
  weeklyHoursTarget: string;
  weeklyHoursMax: string;
  dailyHoursMax: string;
  maxContinuousMinutes: string;
}):
  | {
      ok: true;
      payload: {
        weekly_hours_target: number | null;
        weekly_hours_max: number | null;
        daily_hours_max: number | null;
        max_continuous_minutes: number | null;
      };
    }
  | { ok: false; code: 'teacher_workload_limit_invalid' } {
  const weeklyTarget = parseOptionalNonNegativeNumber(input.weeklyHoursTarget);
  const weeklyMax = parseOptionalNonNegativeNumber(input.weeklyHoursMax);
  const dailyMax = parseOptionalNonNegativeNumber(input.dailyHoursMax);
  const continuous = parseOptionalNonNegativeNumber(input.maxContinuousMinutes);
  if (!weeklyTarget.ok || !weeklyMax.ok || !dailyMax.ok || !continuous.ok) {
    return { ok: false, code: 'teacher_workload_limit_invalid' };
  }
  if (
    dailyMax.value != null &&
    weeklyMax.value != null &&
    dailyMax.value > weeklyMax.value
  ) {
    return { ok: false, code: 'teacher_workload_limit_invalid' };
  }
  if (
    continuous.value != null &&
    dailyMax.value != null &&
    continuous.value > dailyMax.value * 60 + 1e-6
  ) {
    return { ok: false, code: 'teacher_workload_limit_invalid' };
  }
  return {
    ok: true,
    payload: {
      weekly_hours_target: weeklyTarget.value,
      weekly_hours_max: weeklyMax.value,
      daily_hours_max: dailyMax.value,
      max_continuous_minutes:
        continuous.value == null ? null : Math.round(continuous.value),
    },
  };
}

export function refIds(
  refs: Array<{ id?: number | null }> | undefined | null,
): number[] {
  if (!refs?.length) return [];
  return refs
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id) && id > 0);
}
