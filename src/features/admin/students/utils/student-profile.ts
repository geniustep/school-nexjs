import type { Ref } from '@/types/api';
import type {
  StudentCreateAcademicBlock,
  StudentCreatePayload,
  StudentEnrollment,
  StudentEnrollmentBlock,
  StudentNationalityOption,
  StudentOptions,
  StudentRefOption,
  StudentSummary,
  StudentUpdatePayload,
} from '@/types/student-360';
import type { FeePlanSuggestResult, StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import { buildStudentCreateFinancePayload } from './student-enrollment-finance';

export const DEPARTURE_STATUSES = new Set(['withdrawn', 'transferred']);

export interface StudentProfileFormState {
  firstName: string;
  lastName: string;
  firstNameLatin: string;
  lastNameLatin: string;
  nameAr: string;
  nameLatin: string;
  gender: string;
  dateOfBirth: string;
  birthPlace: string;
  nationalityId: string;
  massarCode: string;
  code: string;
  schoolNumber: string;
  status: string;
  admissionDate: string;
  departureReason: string;
  schoolId: string;
  cycleId: string;
  academicYearId: string;
  levelId: string;
  classId: string;
  registrationType: string;
  previousSchool: string;
  isRepeating: boolean;
  actualJoinDate: string;
  registrationNotes: string;
  phone: string;
  mobile: string;
  email: string;
  street: string;
  district: string;
  city: string;
  zip: string;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyPhoneAlt: string;
  emergencyNotes: string;
}

export interface StudentProfileFieldErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  actualJoinDate?: string;
  admissionDate?: string;
  email?: string;
  departureReason?: string;
  previousSchool?: string;
  emergencyPhone?: string;
  classId?: string;
  massarCode?: string;
  schoolNumber?: string;
  code?: string;
  academicYearId?: string;
  cycleId?: string;
  levelId?: string;
}

export interface StudentProfileValidationResult {
  valid: boolean;
  errors: StudentProfileFieldErrors;
}

function trim(value: string): string {
  return value.trim();
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildFullNamePreview(firstName: string, lastName: string): string {
  return [trim(firstName), trim(lastName)].filter(Boolean).join(' ');
}

function optionalString(value: string): string | undefined {
  const v = trim(value);
  return v || undefined;
}

function optionalNumber(value: string): number | undefined {
  const v = trim(value);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function positiveIdFromState(value: string): number | null {
  const id = optionalNumber(value);
  if (id == null || id <= 0) return null;
  return id;
}

function refLabel(value: Ref | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name ?? '';
}

const GENDER_I18N_KEYS: Record<string, string> = {
  male: 'admin.male',
  female: 'admin.female',
};

export function localizeStudentGenderOptions(
  genders: { value: string; label: string }[],
  t: (key: string) => string,
): { value: string; label: string }[] {
  return genders.map((item) => {
    const i18nKey = GENDER_I18N_KEYS[item.value];
    if (!i18nKey) return item;
    const translated = t(i18nKey);
    return translated !== i18nKey ? { ...item, label: translated } : item;
  });
}

const DEFAULT_NATIONALITY_CODE = 'MA';
const DEFAULT_NATIONALITY_NAMES = new Set(['morocco', 'maroc', 'المغرب']);

function isMoroccoNationality(item: Pick<StudentNationalityOption, 'name' | 'code'>): boolean {
  if (trim(item.code ?? '').toUpperCase() === DEFAULT_NATIONALITY_CODE) return true;
  return DEFAULT_NATIONALITY_NAMES.has(trim(item.name).toLowerCase());
}

export function resolveDefaultNationalityId(
  nationalities: StudentOptions['nationalities'] | null | undefined,
): string {
  if (!nationalities?.length) return '';

  const byCode = nationalities.find(
    (item) => trim(item.code ?? '').toUpperCase() === DEFAULT_NATIONALITY_CODE,
  );
  if (byCode) return String(byCode.id);

  const byName = nationalities.find((item) => isMoroccoNationality(item));
  return byName ? String(byName.id) : '';
}

export function sortNationalityOptions(
  nationalities: StudentNationalityOption[],
): StudentNationalityOption[] {
  if (nationalities.length <= 1) return nationalities;

  const morocco: StudentNationalityOption[] = [];
  const rest: StudentNationalityOption[] = [];
  for (const item of nationalities) {
    if (isMoroccoNationality(item)) morocco.push(item);
    else rest.push(item);
  }
  return [...morocco, ...rest];
}

export function defaultStudentProfileFormState(options: StudentOptions | null): StudentProfileFormState {
  const today = todayIsoDate();
  return {
    firstName: '',
    lastName: '',
    firstNameLatin: '',
    lastNameLatin: '',
    nameAr: '',
    nameLatin: '',
    gender: '',
    dateOfBirth: '',
    birthPlace: '',
    nationalityId: resolveDefaultNationalityId(options?.nationalities),
    massarCode: '',
    code: '',
    schoolNumber: '',
    status: options?.studentStatuses.find((s) => s.value === 'active')?.value ?? 'active',
    admissionDate: today,
    departureReason: '',
    schoolId: options?.schools.length === 1 ? String(options.schools[0].id) : '',
    cycleId: '',
    academicYearId: options?.academicYears[0] ? String(options.academicYears[0].id) : '',
    levelId: '',
    classId: '',
    registrationType: options?.registrationTypes[0]?.value ?? 'new',
    previousSchool: '',
    isRepeating: false,
    actualJoinDate: today,
    registrationNotes: '',
    phone: '',
    mobile: '',
    email: '',
    street: '',
    district: '',
    city: '',
    zip: '',
    emergencyContactName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyPhoneAlt: '',
    emergencyNotes: '',
  };
}

export function studentProfileFormStateFromStudent(
  student: StudentSummary,
  enrollment: StudentEnrollment | null | undefined,
  options: StudentOptions | null,
): StudentProfileFormState {
  const base = defaultStudentProfileFormState(options);
  return {
    ...base,
    firstName: student.first_name ?? '',
    lastName: student.last_name ?? '',
    nameAr: student.name_ar ?? '',
    nameLatin: student.name_latin ?? '',
    gender: student.gender ?? '',
    dateOfBirth: student.date_of_birth ?? '',
    birthPlace: student.birth_place ?? '',
    nationalityId:
      student.nationality_id != null
        ? String(student.nationality_id)
        : student.nationality?.id != null
          ? String(student.nationality.id)
          : '',
    massarCode: student.massar_code ?? '',
    code: student.code ?? '',
    schoolNumber: student.school_number ?? student.matricule ?? '',
    status: student.status ?? base.status,
    admissionDate: student.admission_date ?? '',
    departureReason: student.departure_reason ?? enrollment?.departure_reason ?? '',
    schoolId: String(enrollment?.school?.id ?? student.school?.id ?? base.schoolId),
    academicYearId:
      enrollment?.academic_year && typeof enrollment.academic_year === 'object'
        ? String(enrollment.academic_year.id)
        : base.academicYearId,
    levelId: String(enrollment?.level?.id ?? student.level?.id ?? ''),
    classId: String(enrollment?.class?.id ?? student.class?.id ?? ''),
    registrationType: enrollment?.registration_type ?? base.registrationType,
    previousSchool: enrollment?.previous_school ?? '',
    isRepeating: enrollment?.is_repeating ?? false,
    actualJoinDate: enrollment?.actual_join_date ?? '',
    registrationNotes: enrollment?.registration_notes ?? '',
    phone: student.phone ?? '',
    mobile: student.mobile ?? '',
    email: student.email ?? '',
    street: student.street ?? '',
    district: student.district ?? '',
    city: student.city ?? '',
    zip: student.zip ?? '',
    emergencyContactName: student.emergency_contact_name ?? '',
    emergencyRelationship: student.emergency_relationship ?? '',
    emergencyPhone: student.emergency_phone ?? '',
    emergencyPhoneAlt: student.emergency_phone_alt ?? '',
    emergencyNotes: student.emergency_notes ?? '',
  };
}

function isFutureDate(value: string): boolean {
  if (!value) return false;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return false;
  const [y, m, d] = parts;
  const input = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return input.getTime() > today.getTime();
}

function isBefore(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a < b;
}

export function requiresDepartureReason(status: string): boolean {
  return DEPARTURE_STATUSES.has(status);
}

export function requiresPreviousSchool(registrationType: string): boolean {
  return registrationType === 'transfer';
}

export function showRepeatingField(registrationType: string): boolean {
  return registrationType === 're_enrollment';
}

export function validateStudentProfileForm(
  state: StudentProfileFormState,
  t: (key: string) => string,
): StudentProfileValidationResult {
  const errors: StudentProfileFieldErrors = {};
  if (!trim(state.firstName)) errors.firstName = t('admin.student360.errors.firstNameRequired');
  if (!trim(state.lastName)) errors.lastName = t('admin.student360.errors.lastNameRequired');
  if (state.dateOfBirth && isFutureDate(state.dateOfBirth)) {
    errors.dateOfBirth = t('admin.student360.errors.invalidBirthDate');
  }
  if (state.actualJoinDate && state.dateOfBirth && isBefore(state.actualJoinDate, state.dateOfBirth)) {
    errors.actualJoinDate = t('admin.student360.errors.joinBeforeBirth');
  }
  if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(state.email))) {
    errors.email = t('admin.student360.errors.invalidEmail');
  }
  if (requiresDepartureReason(state.status) && !trim(state.departureReason)) {
    errors.departureReason = t('admin.student360.errors.departureReasonRequired');
  }
  if (requiresPreviousSchool(state.registrationType) && !trim(state.previousSchool)) {
    errors.previousSchool = t('admin.student360.errors.previousSchoolRequired');
  }
  if (trim(state.emergencyContactName) && !trim(state.emergencyPhone)) {
    errors.emergencyPhone = t('admin.student360.errors.emergencyPhoneRecommended');
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function hasStudentCreateIdentifier(state: StudentProfileFormState): boolean {
  return Boolean(trim(state.massarCode) || trim(state.schoolNumber) || trim(state.code));
}

export function validateStudentCreateIdentifier(
  state: StudentProfileFormState,
  t: (key: string) => string,
): StudentProfileValidationResult {
  if (hasStudentCreateIdentifier(state)) {
    return { valid: true, errors: {} };
  }
  const message = t('admin.student360.create.errors.studentIdentifierRequired');
  return {
    valid: false,
    errors: {
      massarCode: message,
      schoolNumber: message,
      code: message,
    },
  };
}

function applyStudentCreateIdentifierValidation(
  state: StudentProfileFormState,
  t: (key: string) => string,
  errors: StudentProfileFieldErrors,
): void {
  const identifier = validateStudentCreateIdentifier(state, t);
  if (!identifier.valid) {
    Object.assign(errors, identifier.errors);
  }
}

export function validateStudentCreateIdentityStep(
  state: StudentProfileFormState,
  t: (key: string) => string,
): StudentProfileValidationResult {
  const base = validateStudentProfileForm(state, t);
  const errors: StudentProfileFieldErrors = { ...base.errors };

  if (!trim(state.firstName)) {
    errors.firstName = t('admin.student360.errors.firstNameRequired');
  } else if (!/\S/.test(trim(state.firstName))) {
    errors.firstName = t('admin.student360.errors.firstNameRequired');
  }
  if (!trim(state.lastName)) {
    errors.lastName = t('admin.student360.errors.lastNameRequired');
  } else if (!/\S/.test(trim(state.lastName))) {
    errors.lastName = t('admin.student360.errors.lastNameRequired');
  }

  const massar = trim(state.massarCode);
  if (massar && /\s/.test(massar)) {
    errors.massarCode = t('admin.student360.create.errors.massarNoSpaces');
  }

  applyStudentCreateIdentifierValidation(state, t, errors);

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStudentCreateForm(
  state: StudentProfileFormState,
  t: (key: string) => string,
): StudentProfileValidationResult {
  const base = validateStudentProfileForm(state, t);
  const errors: StudentProfileFieldErrors = { ...base.errors };

  if (!trim(state.firstName)) {
    errors.firstName = t('admin.student360.errors.firstNameRequired');
  } else if (!/\S/.test(trim(state.firstName))) {
    errors.firstName = t('admin.student360.errors.firstNameRequired');
  }
  if (!trim(state.lastName)) {
    errors.lastName = t('admin.student360.errors.lastNameRequired');
  } else if (!/\S/.test(trim(state.lastName))) {
    errors.lastName = t('admin.student360.errors.lastNameRequired');
  }

  if (!trim(state.cycleId)) {
    errors.cycleId = t('admin.student360.create.errors.cycleRequired');
  }
  if (!trim(state.academicYearId)) {
    errors.academicYearId = t('admin.student360.create.errors.academicYearRequired');
  } else if (positiveIdFromState(state.academicYearId) == null) {
    errors.academicYearId = t('admin.student360.create.errors.academicYearRequired');
  }
  if (!trim(state.levelId)) {
    errors.levelId = t('admin.student360.create.errors.levelRequired');
  } else if (positiveIdFromState(state.levelId) == null) {
    errors.levelId = t('admin.student360.create.errors.levelRequired');
  }

  const massar = trim(state.massarCode);
  if (massar && /\s/.test(massar)) {
    errors.massarCode = t('admin.student360.create.errors.massarNoSpaces');
  }

  applyStudentCreateIdentifierValidation(state, t, errors);

  return { valid: Object.keys(errors).length === 0, errors };
}

function buildEnrollmentBlock(state: StudentProfileFormState): StudentEnrollmentBlock | undefined {
  const block: StudentEnrollmentBlock = {};
  if (state.registrationType) block.registration_type = state.registrationType;
  if (requiresPreviousSchool(state.registrationType)) {
    block.previous_school = trim(state.previousSchool) || null;
  } else if (trim(state.previousSchool)) {
    block.previous_school = trim(state.previousSchool);
  }
  if (showRepeatingField(state.registrationType) || state.isRepeating) {
    block.is_repeating = state.isRepeating;
  }
  const join = optionalString(state.actualJoinDate);
  if (join) block.actual_join_date = join;
  const notes = optionalString(state.registrationNotes);
  if (notes) block.registration_notes = notes;
  if (requiresDepartureReason(state.status)) {
    const reason = trim(state.departureReason);
    if (reason) block.departure_reason = reason;
  }
  return Object.keys(block).length > 0 ? block : undefined;
}

function applyIdentityFields(
  payload: StudentCreatePayload,
  state: StudentProfileFormState,
): void {
  payload.first_name = trim(state.firstName);
  payload.last_name = trim(state.lastName);

  const composedAr = buildFullNamePreview(state.firstName, state.lastName);
  const explicitAr = optionalString(state.nameAr);
  if (explicitAr) payload.name_ar = explicitAr;
  else if (composedAr) payload.name_ar = composedAr;

  const latinParts = buildFullNamePreview(state.firstNameLatin, state.lastNameLatin);
  const explicitLatin = optionalString(state.nameLatin);
  if (explicitLatin) payload.name_latin = explicitLatin;
  else if (latinParts) payload.name_latin = latinParts;
  const gender = optionalString(state.gender);
  if (gender) payload.gender = gender;
  const dob = optionalString(state.dateOfBirth);
  if (dob) payload.date_of_birth = dob;
  const birthPlace = optionalString(state.birthPlace);
  if (birthPlace) payload.birth_place = birthPlace;
  const nationalityId = optionalNumber(state.nationalityId);
  if (nationalityId != null) payload.nationality_id = nationalityId;
  const massar = optionalString(state.massarCode);
  if (massar) payload.massar_code = massar;
  const code = optionalString(state.code);
  if (code) payload.code = code;
  const schoolNumber = optionalString(state.schoolNumber);
  if (schoolNumber) payload.school_number = schoolNumber;
  if (state.status) payload.status = state.status;
  const admission = optionalString(state.admissionDate);
  if (admission) payload.admission_date = admission;
  if (requiresDepartureReason(state.status)) {
    const reason = trim(state.departureReason);
    if (reason) payload.departure_reason = reason;
  }
}

function applyContactFields(payload: StudentCreatePayload, state: StudentProfileFormState): void {
  const phone = optionalString(state.phone);
  if (phone) payload.phone = phone;
  const mobile = optionalString(state.mobile);
  if (mobile) payload.mobile = mobile;
  const email = optionalString(state.email);
  if (email) payload.email = email;
  const street = optionalString(state.street);
  if (street) payload.street = street;
  const district = optionalString(state.district);
  if (district) payload.district = district;
  const city = optionalString(state.city);
  if (city) payload.city = city;
  const zip = optionalString(state.zip);
  if (zip) payload.zip = zip;
}

function applyEmergencyFields(payload: StudentCreatePayload, state: StudentProfileFormState): void {
  const name = optionalString(state.emergencyContactName);
  if (name) payload.emergency_contact_name = name;
  const rel = optionalString(state.emergencyRelationship);
  if (rel) payload.emergency_relationship = rel;
  const phone = optionalString(state.emergencyPhone);
  if (phone) payload.emergency_phone = phone;
  const alt = optionalString(state.emergencyPhoneAlt);
  if (alt) payload.emergency_phone_alt = alt;
  const notes = optionalString(state.emergencyNotes);
  if (notes) payload.emergency_notes = notes;
}

export function getStudentCreateFinanceBlockReason(
  state: StudentProfileFormState,
  schoolId: number | null | undefined,
): 'ok' | 'school' | 'academic_year' | 'level' | 'class' | 'join_date' {
  if (schoolId == null || schoolId <= 0) return 'school';
  if (positiveIdFromState(state.academicYearId) == null) return 'academic_year';
  if (positiveIdFromState(state.levelId) == null) return 'level';
  if (!trim(state.actualJoinDate)) return 'join_date';
  if (positiveIdFromState(state.classId) == null) return 'class';
  return 'ok';
}

export function canAttachFinanceToStudentCreatePayload(
  state: StudentProfileFormState,
  schoolId: number | null | undefined,
): boolean {
  return getStudentCreateFinanceBlockReason(state, schoolId) === 'ok';
}

export function buildStudentCreateAcademicBlock(
  state: StudentProfileFormState,
  schoolId: number,
): StudentCreateAcademicBlock | null {
  const academicYearId = optionalNumber(state.academicYearId);
  const levelId = optionalNumber(state.levelId);
  const enrollmentDate = optionalString(state.actualJoinDate);
  if (academicYearId == null || levelId == null || !enrollmentDate) return null;

  const block: StudentCreateAcademicBlock = {
    school_id: schoolId,
    academic_year_id: academicYearId,
    level_id: levelId,
    enrollment_date: enrollmentDate,
  };
  const classId = optionalNumber(state.classId);
  if (classId != null) block.class_id = classId;
  return block;
}

export function buildStudentCreatePayload(
  state: StudentProfileFormState,
  finance?: {
    suggest: FeePlanSuggestResult | null;
    financeState: StudentCreateFinanceFormState;
    schoolId?: number | null;
    activationMode?: 'activate';
  } | null,
): StudentCreatePayload {
  const payload: StudentCreatePayload = {
    first_name: '',
    last_name: '',
  };
  applyIdentityFields(payload, state);
  applyContactFields(payload, state);
  applyEmergencyFields(payload, state);
  const classId = optionalNumber(state.classId);
  if (classId != null) payload.class_id = classId;
  const enrollment = buildEnrollmentBlock(state);
  if (enrollment) payload.enrollment = enrollment;
  if (finance?.suggest && canAttachFinanceToStudentCreatePayload(state, finance.schoolId)) {
    const academic = buildStudentCreateAcademicBlock(state, finance.schoolId as number);
    if (academic?.class_id != null) {
      payload.academic = academic;
      payload.finance = buildStudentCreateFinancePayload(
        finance.suggest,
        finance.financeState,
        finance.activationMode ? { activationMode: finance.activationMode } : undefined,
      );
    }
  }
  return payload;
}

function enrollmentChanged(
  current: StudentProfileFormState,
  original: StudentProfileFormState,
): boolean {
  return (
    current.classId !== original.classId ||
    current.registrationType !== original.registrationType ||
    current.previousSchool !== original.previousSchool ||
    current.isRepeating !== original.isRepeating ||
    current.actualJoinDate !== original.actualJoinDate ||
    current.registrationNotes !== original.registrationNotes ||
    current.departureReason !== original.departureReason
  );
}

function fieldChanged(a: string | boolean, b: string | boolean): boolean {
  return a !== b;
}

export function buildStudentPartialUpdatePayload(
  current: StudentProfileFormState,
  original: StudentProfileFormState,
): StudentUpdatePayload {
  const payload: StudentUpdatePayload = {};

  if (fieldChanged(current.firstName, original.firstName)) {
    payload.first_name = trim(current.firstName);
  }
  if (fieldChanged(current.lastName, original.lastName)) {
    payload.last_name = trim(current.lastName);
  }
  if (fieldChanged(current.nameAr, original.nameAr)) {
    const v = optionalString(current.nameAr);
    if (v) payload.name_ar = v;
  }
  if (fieldChanged(current.nameLatin, original.nameLatin)) {
    const v = optionalString(current.nameLatin);
    if (v) payload.name_latin = v;
  }
  if (fieldChanged(current.gender, original.gender)) {
    const v = optionalString(current.gender);
    if (v) payload.gender = v;
  }
  if (fieldChanged(current.dateOfBirth, original.dateOfBirth)) {
    const v = optionalString(current.dateOfBirth);
    if (v) payload.date_of_birth = v;
  }
  if (fieldChanged(current.birthPlace, original.birthPlace)) {
    const v = optionalString(current.birthPlace);
    if (v) payload.birth_place = v;
  }
  if (fieldChanged(current.nationalityId, original.nationalityId)) {
    const v = optionalNumber(current.nationalityId);
    if (v != null) payload.nationality_id = v;
  }
  if (fieldChanged(current.massarCode, original.massarCode)) {
    const v = optionalString(current.massarCode);
    if (v) payload.massar_code = v;
  }
  if (fieldChanged(current.code, original.code)) {
    const v = optionalString(current.code);
    if (v) payload.code = v;
  }
  if (fieldChanged(current.schoolNumber, original.schoolNumber)) {
    const v = optionalString(current.schoolNumber);
    if (v) payload.school_number = v;
  }
  if (fieldChanged(current.status, original.status)) {
    payload.status = current.status;
  }
  if (fieldChanged(current.admissionDate, original.admissionDate)) {
    const v = optionalString(current.admissionDate);
    if (v) payload.admission_date = v;
  }
  if (fieldChanged(current.departureReason, original.departureReason)) {
    const v = trim(current.departureReason);
    if (v) payload.departure_reason = v;
  }

  const contactPairs: Array<[keyof StudentCreatePayload, keyof StudentProfileFormState]> = [
    ['phone', 'phone'],
    ['mobile', 'mobile'],
    ['email', 'email'],
    ['street', 'street'],
    ['district', 'district'],
    ['city', 'city'],
    ['zip', 'zip'],
    ['emergency_contact_name', 'emergencyContactName'],
    ['emergency_relationship', 'emergencyRelationship'],
    ['emergency_phone', 'emergencyPhone'],
    ['emergency_phone_alt', 'emergencyPhoneAlt'],
    ['emergency_notes', 'emergencyNotes'],
  ];

  for (const [payloadKey, stateKey] of contactPairs) {
    if (fieldChanged(current[stateKey], original[stateKey])) {
      const v = optionalString(current[stateKey] as string);
      if (v) (payload as Record<string, unknown>)[payloadKey] = v;
    }
  }

  if (enrollmentChanged(current, original)) {
    const classId = optionalNumber(current.classId);
    if (classId != null) payload.class_id = classId;
    const enrollment = buildEnrollmentBlock(current);
    if (enrollment) payload.enrollment = enrollment;
  }

  return payload;
}

export function optionLabel(
  options: StudentRefOption[] | undefined,
  value: string | null | undefined,
): string {
  if (!value) return '';
  return options?.find((o) => o.value === value)?.label ?? value;
}

export function displayCountryState(value: Ref | string | null | undefined): string {
  return refLabel(value) || '';
}
