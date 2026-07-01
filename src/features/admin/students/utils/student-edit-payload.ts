import type { SiblingLine } from '@/types/sibling-line';
import type { StudentCreatePayload, StudentUpdatePayload } from '@/types/student-360';
import {
  buildSiblingLinesPayload,
  siblingLinesFingerprint,
} from '@/features/admin/admissions/utils/sibling-lines';
import {
  buildStudentPartialUpdatePayload,
  type StudentProfileFormState,
} from './student-profile';

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
