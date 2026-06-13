import type {
  Teacher,
  TeacherOptions,
  TeacherProfileFormState,
  TeacherProfileFieldErrors,
  TeacherProfilePayload,
  TeacherProfileValidationResult,
} from '@/types/teacher';
import { normalizeTeacherOptions } from './teacher-options';

export { normalizeTeacherOptions };

export const SPECIALIZATION_DEFAULT_MAX = 128;

export function hasTeacherGenderOptions(options: TeacherOptions | null): boolean {
  return (options?.genders.length ?? 0) > 0;
}

export function isOfficialGenderValue(value: string, options: TeacherOptions | null): boolean {
  const code = value.trim();
  if (!code) return true;
  if (!hasTeacherGenderOptions(options)) return false;
  return options!.genders.some((item) => item.value === code);
}

/** Legacy gender from API that is not in current official options (read-only on edit). */
export function resolveTeacherLegacyGender(
  teacher: Pick<Teacher, 'gender'> | null | undefined,
  options: TeacherOptions | null,
): string | null {
  const raw = teacher?.gender?.trim();
  if (!raw || isOfficialGenderValue(raw, options)) return null;
  return raw;
}

function normalizeGenderFormValue(
  raw: string | null | undefined,
  options: TeacherOptions | null,
): string {
  const code = raw?.trim() ?? '';
  if (!code) return '';
  return isOfficialGenderValue(code, options) ? code : '';
}

function todayDateOnlyString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultTeacherProfileFormState(options: TeacherOptions | null): TeacherProfileFormState {
  const defaults = options?.defaults;
  return {
    name: '',
    code: '',
    phone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    specialization: '',
    login: '',
    teacherType:
      defaults?.teacherType && options?.teacherTypes.some((o) => o.value === defaults.teacherType)
        ? defaults.teacherType
        : options?.teacherTypes[0]?.value ?? defaults?.teacherType ?? '',
    qualification: '',
    weeklyHoursTarget: '',
    weeklyHoursMax: '',
    maxContinuousMinutes: '',
    preferCompactSchedule: defaults?.preferCompactSchedule ?? false,
    status: defaults?.status ?? options?.statuses.find((s) => s.value === 'active')?.value ?? 'active',
    active: defaults?.active ?? true,
    schoolId: options?.schools.length === 1 ? String(options.schools[0].id) : '',
  };
}

export function teacherProfileFormStateFromTeacher(
  teacher: Teacher,
  options: TeacherOptions | null,
): TeacherProfileFormState {
  return {
    name: teacher.name ?? '',
    code: teacher.code ?? '',
    phone: teacher.phone ?? '',
    email: teacher.email ?? '',
    gender: normalizeGenderFormValue(teacher.gender, options),
    dateOfBirth: teacher.date_of_birth ?? '',
    specialization: teacher.specialization ?? '',
    login: teacher.login?.trim() || teacher.account?.login?.trim() || teacher.email?.trim() || '',
    teacherType: teacher.teacher_type ?? options?.defaults.teacherType ?? '',
    qualification: teacher.qualification ?? '',
    weeklyHoursTarget:
      teacher.weekly_hours_target != null ? String(teacher.weekly_hours_target) : '',
    weeklyHoursMax: teacher.weekly_hours_max != null ? String(teacher.weekly_hours_max) : '',
    maxContinuousMinutes:
      teacher.max_continuous_minutes != null ? String(teacher.max_continuous_minutes) : '',
    preferCompactSchedule: teacher.prefer_compact_schedule ?? false,
    status: teacher.status ?? options?.defaults.status ?? 'active',
    active: teacher.active ?? teacher.status === 'active',
    schoolId: String(teacher.school_id ?? teacher.school?.id ?? options?.schools[0]?.id ?? ''),
  };
}

function parseOptionalNumber(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function resolveSpecializationMax(options: TeacherOptions | null): number {
  const max = options?.constraints.specialization?.max;
  return typeof max === 'number' && Number.isFinite(max) && max > 0
    ? max
    : SPECIALIZATION_DEFAULT_MAX;
}

export function buildTeacherCreatePayload(
  state: TeacherProfileFormState,
  identity: Record<string, unknown>,
  options: TeacherOptions | null,
): TeacherProfilePayload {
  const payload: TeacherProfilePayload = {
    name: state.name.trim(),
    ...identity,
  };

  const code = state.code.trim();
  if (code) payload.code = code;

  const phone = state.phone.trim();
  if (phone) payload.phone = phone;

  if (hasTeacherGenderOptions(options)) {
    const gender = state.gender.trim();
    if (gender && isOfficialGenderValue(gender, options)) {
      payload.gender = gender;
    }
  }

  if (state.dateOfBirth.trim()) payload.date_of_birth = state.dateOfBirth.trim();

  const specialization = state.specialization.trim();
  if (specialization) payload.specialization = specialization;

  if (state.teacherType) payload.teacher_type = state.teacherType;

  if (state.qualification.trim()) payload.qualification = state.qualification.trim();

  const target = parseOptionalNumber(state.weeklyHoursTarget);
  if (target !== undefined && target !== null) payload.weekly_hours_target = target;

  const max = parseOptionalNumber(state.weeklyHoursMax);
  if (max !== undefined && max !== null) payload.weekly_hours_max = max;

  const continuous = parseOptionalNumber(state.maxContinuousMinutes);
  if (continuous !== undefined && continuous !== null) payload.max_continuous_minutes = continuous;

  payload.prefer_compact_schedule = state.preferCompactSchedule;
  payload.status = state.status || options?.defaults.status || 'active';
  payload.active = state.active;

  if (options && options.schools.length > 1 && state.schoolId) {
    payload.school_id = Number(state.schoolId);
  }

  return payload;
}

export function buildTeacherUpdatePayload(
  current: TeacherProfileFormState,
  original: TeacherProfileFormState,
  identity: Record<string, unknown>,
  options: TeacherOptions | null,
): TeacherProfilePayload {
  const payload: TeacherProfilePayload = { ...identity };

  if (current.name.trim() !== original.name.trim()) payload.name = current.name.trim();

  if (current.code.trim() !== original.code.trim()) {
    payload.code = current.code.trim() || '';
  }

  if (current.phone.trim() !== original.phone.trim()) {
    payload.phone = current.phone.trim() || '';
  }

  if (
    hasTeacherGenderOptions(options) &&
    current.gender !== original.gender &&
    isOfficialGenderValue(current.gender, options)
  ) {
    payload.gender = current.gender.trim() ? current.gender.trim() : '';
  }

  if (current.dateOfBirth.trim() !== original.dateOfBirth.trim()) {
    payload.date_of_birth = current.dateOfBirth.trim() ? current.dateOfBirth.trim() : null;
  }

  if (current.specialization !== original.specialization) {
    payload.specialization = current.specialization.trim() ? current.specialization.trim() : '';
  }

  if (current.teacherType !== original.teacherType && current.teacherType) {
    payload.teacher_type = current.teacherType;
  }

  if (current.qualification !== original.qualification) {
    payload.qualification = current.qualification.trim() ? current.qualification.trim() : '';
  }

  if (current.weeklyHoursTarget.trim() !== original.weeklyHoursTarget.trim()) {
    const target = parseOptionalNumber(current.weeklyHoursTarget);
    payload.weekly_hours_target = target === undefined ? null : target;
  }

  if (current.weeklyHoursMax.trim() !== original.weeklyHoursMax.trim()) {
    const max = parseOptionalNumber(current.weeklyHoursMax);
    payload.weekly_hours_max = max === undefined ? null : max;
  }

  if (current.maxContinuousMinutes.trim() !== original.maxContinuousMinutes.trim()) {
    const continuous = parseOptionalNumber(current.maxContinuousMinutes);
    payload.max_continuous_minutes = continuous === undefined ? null : continuous;
  }

  if (current.preferCompactSchedule !== original.preferCompactSchedule) {
    payload.prefer_compact_schedule = current.preferCompactSchedule;
  }

  if (current.status !== original.status) payload.status = current.status;

  if (current.active !== original.active) payload.active = current.active;

  if (
    options &&
    options.schools.length > 1 &&
    current.schoolId !== original.schoolId &&
    current.schoolId
  ) {
    payload.school_id = Number(current.schoolId);
  }

  return payload;
}

export function isTeacherProfileFormDirty(
  current: TeacherProfileFormState,
  original: TeacherProfileFormState,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(original);
}

export function resolveStatusActiveConsistency(state: TeacherProfileFormState): TeacherProfileFormState {
  if (state.status === 'active') return state;
  if (state.status === 'resigned' || state.status === 'retired') {
    return { ...state, active: false };
  }
  return state;
}

export function mapTeacherApiFieldError(
  code: string,
  t: (key: string) => string,
): TeacherProfileFieldErrors & { global?: string } {
  switch (code) {
    case 'invalid_gender':
      return { gender: t('admin.academicSetup.teacherForm.errors.invalidGender') };
    case 'invalid_date_of_birth':
    case 'future_date_of_birth':
      return { dateOfBirth: t('admin.academicSetup.teacherForm.errors.invalidDateOfBirth') };
    case 'invalid_specialization':
      return { specialization: t('admin.academicSetup.teacherForm.errors.invalidSpecialization') };
    case 'invalid_teacher_type':
      return { teacherType: t('admin.academicSetup.teacherForm.errors.invalidTeacherType') };
    case 'invalid_qualification':
      return { qualification: t('admin.academicSetup.teacherForm.errors.invalidQualification') };
    case 'invalid_weekly_hours':
      return {
        weeklyHoursTarget: t('admin.academicSetup.teacherForm.errors.invalidWeeklyHours'),
        weeklyHoursMax: t('admin.academicSetup.teacherForm.errors.invalidWeeklyHours'),
      };
    case 'invalid_max_continuous_minutes':
      return {
        maxContinuousMinutes: t('admin.academicSetup.teacherForm.errors.invalidMaxContinuousMinutes'),
      };
    case 'school_not_allowed':
      return { schoolId: t('admin.academicSetup.teacherForm.errors.schoolNotAllowed') };
    default:
      return {};
  }
}

export function validateTeacherProfileForm(
  state: TeacherProfileFormState,
  options: TeacherOptions | null,
  t: (key: string) => string,
): TeacherProfileValidationResult {
  const errors: TeacherProfileFieldErrors = {};
  const minHours = options?.constraints.weeklyHours?.min ?? 0;
  const minContinuous = options?.constraints.maxContinuousMinutes?.min ?? 1;
  const specializationMax = resolveSpecializationMax(options);
  const today = todayDateOnlyString();

  if (!state.name.trim()) {
    errors.name = t('errors.validationFailed');
  }

  if (hasTeacherGenderOptions(options)) {
    if (state.gender.trim() && !isOfficialGenderValue(state.gender, options)) {
      errors.gender = t('admin.academicSetup.teacherForm.errors.invalidGender');
    }
  } else if (state.gender.trim()) {
    errors.gender = t('admin.academicSetup.teacherForm.errors.genderOptionsUnavailable');
  }

  const dob = state.dateOfBirth.trim();
  if (dob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      errors.dateOfBirth = t('admin.academicSetup.teacherForm.errors.invalidDateOfBirth');
    } else if (dob > today) {
      errors.dateOfBirth = t('admin.academicSetup.teacherForm.errors.futureDateOfBirth');
    }
  }

  const specialization = state.specialization.trim();
  if (specialization.length > specializationMax) {
    errors.specialization = t('admin.academicSetup.teacherForm.errors.invalidSpecialization');
  }

  if (state.teacherType && options && !options.teacherTypes.some((o) => o.value === state.teacherType)) {
    errors.teacherType = t('admin.academicSetup.teacherForm.errors.invalidTeacherType');
  }

  if (
    state.qualification &&
    options &&
    !options.qualifications.some((o) => o.value === state.qualification)
  ) {
    errors.qualification = t('admin.academicSetup.teacherForm.errors.invalidQualification');
  }

  const targetRaw = state.weeklyHoursTarget.trim();
  if (targetRaw) {
    const target = Number(targetRaw);
    if (!Number.isFinite(target) || target < minHours) {
      errors.weeklyHoursTarget = t('admin.academicSetup.teacherForm.errors.invalidWeeklyHours');
    }
  }

  const maxRaw = state.weeklyHoursMax.trim();
  let maxValue: number | null = null;
  if (maxRaw) {
    maxValue = Number(maxRaw);
    if (!Number.isFinite(maxValue) || maxValue < minHours) {
      errors.weeklyHoursMax = t('admin.academicSetup.teacherForm.errors.invalidWeeklyHours');
    }
  }

  const targetValue = targetRaw ? Number(targetRaw) : null;
  if (
    targetValue != null &&
    Number.isFinite(targetValue) &&
    maxValue != null &&
    Number.isFinite(maxValue) &&
    maxValue < targetValue
  ) {
    errors.weeklyHoursMax = t('admin.academicSetup.teacherForm.errors.maxBelowTarget');
  }

  const continuousRaw = state.maxContinuousMinutes.trim();
  if (continuousRaw) {
    const continuous = Number(continuousRaw);
    if (!Number.isFinite(continuous) || continuous < minContinuous) {
      errors.maxContinuousMinutes = t('admin.academicSetup.teacherForm.errors.invalidMaxContinuousMinutes');
    }
  }

  if (state.status && options && !options.statuses.some((o) => o.value === state.status)) {
    errors.status = t('admin.academicSetup.teacherForm.errors.invalidStatus');
  }

  if (
    options &&
    options.schools.length > 1 &&
    state.schoolId &&
    !options.schools.some((school) => String(school.id) === state.schoolId)
  ) {
    errors.schoolId = t('admin.academicSetup.teacherForm.errors.schoolNotAllowed');
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function resolveGenderLabel(
  value: string | null | undefined,
  options: TeacherOptions | null,
  t: (key: string) => string,
): string {
  const code = value?.trim();
  if (!code) return t('common.dash');
  const match = options?.genders.find((item) => item.value === code);
  return match?.label ?? code;
}

export function trimSpecialization(value: string): string {
  return value.trim();
}
