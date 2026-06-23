import type { CreateAdmissionPayload } from '@/types/admission';
import type { AdmissionLevelOption } from '@/types/admission';
import type { SiblingLine } from '@/types/sibling-line';
import { buildAdmissionChildFullName } from './admission-child-name';
import { findAdmissionLevel } from './admission-options';
import { buildSiblingLinesPayload } from './sibling-lines';

export interface AdmissionCreateFormState {
  child_first_name_ar: string;
  child_last_name_ar: string;
  child_first_name_fr: string;
  child_last_name_fr: string;
  gender: string;
  birth_date: string;
  massar_code: string;
  previous_school: string;
  external_reference: string;
  residence_address: string;
  has_siblings: boolean;
  siblings_raw_text: string;
  siblings_levels: string;
  sibling_lines: SiblingLine[];
  academic_year_id?: number;
  requested_cycle_code: string;
  requested_level_id?: number;
  requested_stream_id?: number;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship: string;
  guardian_email: string;
  source_id?: number;
  first_contact_date: string;
  next_action: string;
  next_action_date: string;
  internal_notes: string;
}

export function emptyAdmissionCreateForm(today: string): AdmissionCreateFormState {
  return {
    child_first_name_ar: '',
    child_last_name_ar: '',
    child_first_name_fr: '',
    child_last_name_fr: '',
    gender: '',
    birth_date: '',
    massar_code: '',
    previous_school: '',
    external_reference: '',
    residence_address: '',
    has_siblings: false,
    siblings_raw_text: '',
    siblings_levels: '',
    sibling_lines: [],
    requested_cycle_code: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_relationship: '',
    guardian_email: '',
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

  const payload: CreateAdmissionPayload = {
    school_id: schoolId,
    child_first_name_ar: form.child_first_name_ar.trim() || undefined,
    child_last_name_ar: form.child_last_name_ar.trim() || undefined,
    child_first_name_fr: form.child_first_name_fr.trim() || undefined,
    child_last_name_fr: form.child_last_name_fr.trim() || undefined,
    child_name: childName || undefined,
    gender: form.gender || undefined,
    birth_date: form.birth_date || undefined,
    massar_code: form.massar_code.trim() || undefined,
    previous_school: form.previous_school.trim() || undefined,
    external_reference: form.external_reference.trim() || undefined,
    residence_address: form.residence_address.trim() || undefined,
    has_siblings: form.has_siblings || undefined,
    siblings_raw_text: form.siblings_raw_text.trim() || undefined,
    siblings_levels: form.siblings_levels.trim() || undefined,
    sibling_lines: buildSiblingLinesPayload(form.sibling_lines),
    academic_year_id: form.academic_year_id,
    requested_cycle_code: form.requested_cycle_code.trim() || undefined,
    requested_level_id: form.requested_level_id,
    requested_stream_id: includeStream ? form.requested_stream_id : undefined,
    guardian_name: form.guardian_name.trim() || undefined,
    guardian_phone: form.guardian_phone.trim() || undefined,
    guardian_relationship: form.guardian_relationship || undefined,
    guardian_email: form.guardian_email.trim() || undefined,
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
