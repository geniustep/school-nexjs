import type { SiblingLine } from '@/types/sibling-line';
import type { StudentCreatePayload, StudentUpdatePayload } from '@/types/student-360';
import {
  buildSiblingLinesPayload,
  siblingLinesFingerprint,
} from '@/features/admin/admissions/utils/sibling-lines';
import {
  buildStudentPartialUpdatePayload,
  validateStudentProfileForm,
  type StudentProfileFieldErrors,
  type StudentProfileFormState,
  type StudentProfileValidationResult,
} from './student-profile';

const PAYLOAD_KEY_TO_FORM_ERROR_KEY: Partial<
  Record<keyof StudentUpdatePayload, keyof StudentProfileFieldErrors>
> = {
  first_name: 'firstName',
  last_name: 'lastName',
  date_of_birth: 'dateOfBirth',
  email: 'email',
  massar_code: 'massarCode',
  school_number: 'schoolNumber',
  code: 'code',
  class_id: 'classId',
  departure_reason: 'departureReason',
  previous_school: 'previousSchool',
  emergency_phone: 'emergencyPhone',
};

const SECTION_FIELD_FOCUS_ORDER: Record<StudentEditSaveSection, (keyof StudentProfileFieldErrors)[]> = {
  personal: ['firstName', 'lastName', 'dateOfBirth', 'email'],
  identity: ['massarCode', 'schoolNumber', 'code'],
  schooling: ['actualJoinDate', 'previousSchool', 'classId'],
  admin: ['departureReason'],
  emergency: ['emergencyPhone'],
  siblings: ['siblingLines'],
};

function formErrorKeysForSectionPayload(
  payload: StudentUpdatePayload,
  current: StudentProfileFormState,
): (keyof StudentProfileFieldErrors)[] {
  const keys = new Set<keyof StudentProfileFieldErrors>();

  for (const payloadKey of Object.keys(payload) as (keyof StudentUpdatePayload)[]) {
    if (payloadKey === 'enrollment') {
      const enrollment = payload.enrollment;
      if (enrollment?.actual_join_date !== undefined) keys.add('actualJoinDate');
      if (enrollment?.previous_school !== undefined) keys.add('previousSchool');
      if (enrollment?.registration_type !== undefined) keys.add('previousSchool');
      continue;
    }
    const formKey = PAYLOAD_KEY_TO_FORM_ERROR_KEY[payloadKey];
    if (formKey) keys.add(formKey);
  }

  if ('status' in payload) keys.add('departureReason');
  if (trim(current.emergencyContactName) && 'emergency_contact_name' in payload) {
    keys.add('emergencyPhone');
  }
  if ('sibling_lines' in payload) keys.add('siblingLines');

  return Array.from(keys);
}

function trim(value: string): string {
  return value.trim();
}

/** Keys that must never be sent via POST /students/<id>/update. */
export const STUDENT_UPDATE_FORBIDDEN_KEYS = [
  'guardian_relationship_ids',
  'parent_ids',
  'image_1920',
  'image_url',
  'partner_id',
  'user_id',
  'level_id',
  'academic_year_id',
  'school_id',
  'medical_notes',
  'blood_type',
  'has_allergies',
  'allergies_description',
  'has_chronic_conditions',
  'chronic_conditions_description',
  'has_regular_medication',
  'regular_medication_description',
  'has_special_needs',
  'special_needs_description',
  'has_emergency_instructions',
  'emergency_instructions',
  'doctor_name',
  'doctor_phone',
  'insurance_provider',
  'insurance_number',
  'insurance_expiry_date',
  'academic',
  'finance',
] as const satisfies readonly (keyof StudentCreatePayload | string)[];

export type StudentEditSaveSection =
  | 'personal'
  | 'identity'
  | 'schooling'
  | 'admin'
  | 'emergency'
  | 'siblings';

const SECTION_PAYLOAD_KEYS: Record<StudentEditSaveSection, (keyof StudentUpdatePayload)[]> = {
  personal: [
    'first_name',
    'last_name',
    'name_ar',
    'name_latin',
    'gender',
    'date_of_birth',
    'birth_place',
    'nationality_id',
    'phone',
    'mobile',
    'email',
    'street',
    'district',
    'city',
    'zip',
    'residence_address',
  ],
  identity: ['code', 'school_number', 'massar_code', 'external_reference'],
  schooling: [
    'class_id',
    'admission_date',
    'previous_school',
    'enrollment',
  ],
  admin: ['status', 'departure_reason', 'active', 'notes', 'admission_notes'],
  emergency: [
    'emergency_contact_name',
    'emergency_relationship',
    'emergency_phone',
    'emergency_phone_alt',
    'emergency_notes',
  ],
  siblings: ['has_siblings', 'siblings_levels', 'siblings_raw_text', 'sibling_lines'],
};

export function buildSiblingLinesAppendOnlyPayload(
  current: SiblingLine[],
  original: SiblingLine[],
): SiblingLine[] | undefined {
  const originalCount = original.length;
  const baselineSlice = current.slice(0, originalCount);
  if (siblingLinesFingerprint(baselineSlice) !== siblingLinesFingerprint(original)) {
    return undefined;
  }
  const appended = current.slice(originalCount);
  if (appended.length === 0) return undefined;
  return buildSiblingLinesPayload(appended);
}

export function stripForbiddenStudentUpdateKeys(
  payload: StudentUpdatePayload,
): StudentUpdatePayload {
  const forbidden = new Set<string>(STUDENT_UPDATE_FORBIDDEN_KEYS);
  const next: StudentUpdatePayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!forbidden.has(key)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function buildStudentEditUpdatePayload(
  current: StudentProfileFormState,
  original: StudentProfileFormState,
  originalSiblingLines: SiblingLine[],
): StudentUpdatePayload {
  const payload = buildStudentPartialUpdatePayload(current, original);

  if ('sibling_lines' in payload) {
    const appendOnly = buildSiblingLinesAppendOnlyPayload(current.siblingLines, originalSiblingLines);
    if (appendOnly?.length) payload.sibling_lines = appendOnly;
    else delete payload.sibling_lines;
  }

  return stripForbiddenStudentUpdateKeys(payload);
}

export function filterStudentEditPayloadBySection(
  payload: StudentUpdatePayload,
  section: StudentEditSaveSection,
): StudentUpdatePayload {
  const allowed = new Set<string>(SECTION_PAYLOAD_KEYS[section]);
  const next: StudentUpdatePayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function pickStudentEditSectionPayload(
  current: StudentProfileFormState,
  original: StudentProfileFormState,
  originalSiblingLines: SiblingLine[],
  section: StudentEditSaveSection,
): StudentUpdatePayload {
  const full = buildStudentEditUpdatePayload(current, original, originalSiblingLines);
  return filterStudentEditPayloadBySection(full, section);
}

export function hasForbiddenStudentUpdateKeys(payload: StudentUpdatePayload): string[] {
  const forbidden = new Set<string>(STUDENT_UPDATE_FORBIDDEN_KEYS);
  return Object.keys(payload).filter((key) => forbidden.has(key));
}

/** Validates only fields that are actually being sent in this section save. */
export function validateStudentEditSection(
  current: StudentProfileFormState,
  original: StudentProfileFormState,
  originalSiblingLines: SiblingLine[],
  section: StudentEditSaveSection,
  t: (key: string) => string,
): StudentProfileValidationResult {
  const payload = pickStudentEditSectionPayload(current, original, originalSiblingLines, section);
  if (Object.keys(payload).length === 0) {
    return { valid: true, errors: {} };
  }

  const full = validateStudentProfileForm(current, t);
  const errors: StudentProfileFieldErrors = {};
  for (const key of formErrorKeysForSectionPayload(payload, current)) {
    const message = full.errors[key];
    if (message) errors[key] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function firstStudentEditFieldError(
  errors: StudentProfileFieldErrors,
  section: StudentEditSaveSection,
): string | undefined {
  for (const key of SECTION_FIELD_FOCUS_ORDER[section]) {
    const message = errors[key];
    if (message) return message;
  }
  for (const message of Object.values(errors)) {
    if (message) return message;
  }
  return undefined;
}

export function focusStudentEditFieldError(
  root: HTMLElement | null,
  errors: StudentProfileFieldErrors,
  section: StudentEditSaveSection,
): void {
  if (!root) return;
  const firstKey =
    SECTION_FIELD_FOCUS_ORDER[section].find((key) => errors[key]) ??
    (Object.keys(errors)[0] as keyof StudentProfileFieldErrors | undefined);
  if (!firstKey) return;
  const el = root.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
  if (!el) return;
  const focusable =
    el.matches('input, select, textarea, button')
      ? el
      : el.querySelector<HTMLElement>('input, select, textarea, button');
  (focusable ?? el).focus({ preventScroll: true });
  (focusable ?? el).scrollIntoView({ behavior: 'smooth', block: 'center' });
}
