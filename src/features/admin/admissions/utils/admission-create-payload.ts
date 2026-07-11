import type { CreateAdmissionPayload } from '@/types/admission';
import type { AdmissionLevelOption } from '@/types/admission';
import type { SiblingLine } from '@/types/sibling-line';
import { buildAdmissionChildFullName } from './admission-child-name';
import { findAdmissionLevel } from './admission-options';
import { buildSiblingLinesPayload } from './sibling-lines';
import {
  createPrimaryGuardianDraft,
  deriveLegacyGuardianFields,
  serializeGuardiansPayload,
  type GuardianDraft,
} from '@/features/admin/admissions/guardians';

function composeResidenceAddress(form: AdmissionCreateFormState): string {
  const explicit = form.residence_address.trim();
  if (explicit) return explicit;
  const parts = [form.street.trim(), form.city.trim(), form.zip.trim()].filter(Boolean);
  return parts.join('، ');
}

export interface AdmissionCreateFormState {
  child_first_name_ar: string;
  child_last_name_ar: string;
  child_first_name_fr: string;
  child_last_name_fr: string;
  gender: string;
  birth_date: string;
  birth_place: string;
  nationality_id?: number;
  massar_code: string;
  school_number: string;
  code: string;
  admission_date: string;
  previous_school: string;
  external_reference: string;
  residence_address: string;
  street: string;
  city: string;
  zip: string;
  has_siblings: boolean;
  siblings_raw_text: string;
  siblings_levels: string;
  sibling_lines: SiblingLine[];
  academic_year_id?: number;
  requested_cycle_code: string;
  requested_level_id?: number;
  requested_stream_id?: number;
  requested_class_id?: number;
  registration_type: string;
  actual_join_date: string;
  is_repeating: boolean;
  registration_notes: string;
  /** Derived from guardians[primary] for intake mapper compat. */
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship: string;
  guardian_email: string;
  guardians: GuardianDraft[];
  source_id?: number;
  first_contact_date: string;
  next_action: string;
  next_action_date: string;
  internal_notes: string;
}

export function syncLegacyGuardianFieldsFromDrafts(guardians: GuardianDraft[]): Pick<
  AdmissionCreateFormState,
  'guardian_name' | 'guardian_phone' | 'guardian_relationship' | 'guardian_email'
> {
  const legacy = deriveLegacyGuardianFields(guardians);
  return {
    guardian_name: legacy.guardian_name ?? '',
    guardian_phone: legacy.guardian_phone ?? '',
    guardian_relationship: legacy.guardian_relationship ?? '',
    guardian_email: legacy.guardian_email ?? '',
  };
}

export function emptyAdmissionCreateForm(today: string): AdmissionCreateFormState {
  const guardians = [createPrimaryGuardianDraft()];
  return {
    child_first_name_ar: '',
    child_last_name_ar: '',
    child_first_name_fr: '',
    child_last_name_fr: '',
    gender: '',
    birth_date: '',
    birth_place: '',
    massar_code: '',
    school_number: '',
    code: '',
    admission_date: today,
    previous_school: '',
    external_reference: '',
    residence_address: '',
    street: '',
    city: '',
    zip: '',
    has_siblings: false,
    siblings_raw_text: '',
    siblings_levels: '',
    sibling_lines: [],
    requested_cycle_code: '',
    registration_type: 'new',
    actual_join_date: today,
    is_repeating: false,
    registration_notes: '',
    guardians,
    ...syncLegacyGuardianFieldsFromDrafts(guardians),
    first_contact_date: today,
    next_action: '',
    next_action_date: '',
    internal_notes: '',
  };
}

export function buildCreateAdmissionPayload(
  form: AdmissionCreateFormState,
  schoolId: number,
  levels: AdmissionLevelOption[] = [],
): CreateAdmissionPayload {
  const childName = buildAdmissionChildFullName(
    form.child_first_name_ar,
    form.child_last_name_ar,
    form.child_first_name_fr,
    form.child_last_name_fr,
  );

  const selectedLevel = findAdmissionLevel(levels, form.requested_level_id);
  const includeStream = Boolean(selectedLevel?.requires_stream && form.requested_stream_id);
  const legacy = deriveLegacyGuardianFields(form.guardians);
  const guardians = serializeGuardiansPayload(form.guardians, { mode: 'individual' });

  const payload: CreateAdmissionPayload = {
    school_id: schoolId,
    child_first_name_ar: form.child_first_name_ar.trim() || undefined,
    child_last_name_ar: form.child_last_name_ar.trim() || undefined,
    child_first_name_fr: form.child_first_name_fr.trim() || undefined,
    child_last_name_fr: form.child_last_name_fr.trim() || undefined,
    child_name: childName || undefined,
    gender: form.gender || undefined,
    birth_date: form.birth_date || undefined,
    birth_place: form.birth_place.trim() || undefined,
    nationality_id: form.nationality_id,
    massar_code: form.massar_code.trim() || undefined,
    school_number: form.school_number.trim() || undefined,
    code: form.code.trim() || undefined,
    admission_date: form.admission_date || undefined,
    previous_school: form.previous_school.trim() || undefined,
    external_reference: form.external_reference.trim() || undefined,
    residence_address: composeResidenceAddress(form) || undefined,
    has_siblings: form.has_siblings || undefined,
    siblings_raw_text: form.siblings_raw_text.trim() || undefined,
    siblings_levels: form.siblings_levels.trim() || undefined,
    sibling_lines: buildSiblingLinesPayload(form.sibling_lines),
    academic_year_id: form.academic_year_id,
    requested_cycle_code: form.requested_cycle_code.trim() || undefined,
    requested_level_id: form.requested_level_id,
    requested_stream_id: includeStream ? form.requested_stream_id : undefined,
    registration_type: form.registration_type || undefined,
    actual_join_date: form.actual_join_date || undefined,
    is_repeating: form.is_repeating || undefined,
    registration_notes: form.registration_notes.trim() || undefined,
    guardian_name: legacy.guardian_name,
    guardian_phone: legacy.guardian_phone,
    guardian_whatsapp: legacy.guardian_whatsapp,
    guardian_relationship: legacy.guardian_relationship,
    relationship: legacy.relationship,
    guardian_email: legacy.guardian_email,
    guardians,
    source_id: form.source_id,
    first_contact_date: form.first_contact_date || undefined,
    next_action: form.next_action.trim() || undefined,
    next_action_date: form.next_action_date || undefined,
    internal_notes: form.internal_notes.trim() || undefined,
  };

  for (const key of Object.keys(payload) as (keyof CreateAdmissionPayload)[]) {
    const val = payload[key];
    if (val === '' || val === undefined) delete payload[key];
  }

  return payload;
}
