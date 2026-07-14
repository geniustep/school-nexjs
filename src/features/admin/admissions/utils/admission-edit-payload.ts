import type { AdmissionDetail, AdmissionLevelOption, PatchAdmissionPayload } from '@/types/admission';
import type { StudentClassOption } from '@/types/student-360';
import { buildAdmissionChildFullName } from './admission-child-name';
import { parseExtraFieldBool } from './admission-extra-fields';
import { refName } from './admission-labels';
import { findAdmissionLevel } from './admission-options';
import {
  diffLimitedPatchPayload,
  filterLimitedPatchPayload,
} from './admission-limited-patch';
import { buildSiblingLinesPayload, normalizeSiblingLines } from './sibling-lines';
import type { AdmissionCreateFormState } from './admission-create-payload';
import {
  deriveLegacyGuardianFields,
  hydrateAdmissionGuardians,
  serializeGuardiansPayload,
} from '@/features/admin/admissions/guardians';
import { syncLegacyGuardianFieldsFromDrafts } from './admission-create-payload';
import { normalizeRequestedServiceIds } from './admission-requested-services';

export interface AdmissionEditFormState extends AdmissionCreateFormState {
  guardian_whatsapp: string;
  priority: string;
}

function toDateInputValue(value: unknown): string {
  if (value == null || value === false) return '';
  const cleaned = editFieldText(value);
  if (!cleaned) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

/** Safely coerce API scalar / option / ref values into trimmed text. */
export function editFieldText(value: unknown): string {
  if (value == null || value === false) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.value === 'string') return obj.value.trim();
    if (typeof obj.code === 'string') return obj.code.trim();
    if (typeof obj.name === 'string') return obj.name.trim();
  }
  const text = String(value).trim();
  return text === '[object Object]' ? '' : text;
}

/** Resolve numeric ids from Ref objects, plain numbers, or numeric strings. */
export function resolveRefId(value: unknown): number | undefined {
  if (value == null || value === false) return undefined;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('id' in obj) {
      const fromId = resolveRefId(obj.id);
      if (fromId) return fromId;
    }
  }
  return undefined;
}

export function resolveRefDisplayName(value: unknown): string {
  if (value == null || value === false) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.display_name === 'string' && obj.display_name.trim()) return obj.display_name.trim();
    if (typeof obj.display_alias === 'string' && obj.display_alias.trim()) return obj.display_alias.trim();
    if (typeof obj.name === 'string' && obj.name.trim()) return obj.name.trim();
    if (typeof obj.label === 'string' && obj.label.trim()) return obj.label.trim();
  }
  return refName(value as never);
}

function composeResidenceAddress(form: AdmissionCreateFormState): string {
  const explicit = form.residence_address.trim();
  if (explicit) return explicit;
  const parts = [form.street.trim(), form.city.trim(), form.zip.trim()].filter(Boolean);
  return parts.join('، ');
}

function splitStudentName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function admissionDetailToEditForm(
  detail: AdmissionDetail,
  levels: AdmissionLevelOption[] = [],
): AdmissionEditFormState {
  const levelId = resolveRefId(detail.requested_level);
  const level = findAdmissionLevel(levels, levelId);

  let childFirstNameAr = editFieldText(detail.student_first_name);
  let childLastNameAr = editFieldText(detail.student_last_name);
  if (!childFirstNameAr && !childLastNameAr) {
    const fromFullName = splitStudentName(editFieldText(detail.student_name));
    childFirstNameAr = fromFullName.firstName;
    childLastNameAr = fromFullName.lastName;
  }

  const guardians = hydrateAdmissionGuardians({
    guardians: detail.guardians,
    legacyFlat: {
      guardian_name: detail.guardian_name,
      guardian_phone: detail.guardian_phone,
      guardian_whatsapp: detail.guardian_whatsapp,
      guardian_email: detail.guardian_email,
      relationship: detail.relationship,
    },
  });
  const legacySync = syncLegacyGuardianFieldsFromDrafts(guardians);

  return {
    child_first_name_ar: childFirstNameAr,
    child_last_name_ar: childLastNameAr,
    child_first_name_fr: '',
    child_last_name_fr: '',
    gender: editFieldText(detail.gender),
    birth_date: toDateInputValue(detail.birth_date),
    birth_place: '',
    massar_code: editFieldText(detail.massar_code),
    school_number: '',
    code: '',
    admission_date: '',
    previous_school: editFieldText(detail.previous_school),
    external_reference: editFieldText(detail.external_reference),
    residence_address: editFieldText(detail.residence_address),
    street: '',
    city: '',
    zip: '',
    has_siblings: parseExtraFieldBool(detail.has_siblings),
    siblings_raw_text: editFieldText(detail.siblings_raw_text),
    siblings_levels: editFieldText(detail.siblings_levels),
    sibling_lines: normalizeSiblingLines(detail.sibling_lines),
    academic_year_id: resolveRefId(detail.academic_year),
    requested_cycle_code: level?.cycle ?? '',
    requested_level_id: levelId,
    requested_stream_id: undefined,
    requested_class_id: resolveRefId(detail.requested_class),
    registration_type: '',
    actual_join_date: '',
    is_repeating: false,
    registration_notes: '',
    guardians,
    guardian_name: legacySync.guardian_name,
    guardian_phone: legacySync.guardian_phone,
    guardian_whatsapp: editFieldText(detail.guardian_whatsapp) || (deriveLegacyGuardianFields(guardians).guardian_whatsapp ?? ''),
    guardian_relationship: legacySync.guardian_relationship,
    guardian_email: legacySync.guardian_email,
    source_id: resolveRefId(detail.source),
    first_contact_date: toDateInputValue(detail.first_contact_date),
    next_action: editFieldText(detail.next_action),
    next_action_date: toDateInputValue(detail.next_action_date),
    internal_notes: editFieldText(detail.internal_notes),
    priority: editFieldText(detail.priority),
    requested_service_ids: normalizeRequestedServiceIds(
      detail.requested_service_ids ?? detail.requested_services,
    ),
  };
}

export function buildPatchAdmissionPayload(
  form: AdmissionEditFormState,
  levels: AdmissionLevelOption[] = [],
  baseline?: AdmissionEditFormState,
): PatchAdmissionPayload {
  const childName = buildAdmissionChildFullName(
    form.child_first_name_ar,
    form.child_last_name_ar,
    form.child_first_name_fr,
    form.child_last_name_fr,
  );

  const siblingLines = buildSiblingLinesPayload(form.sibling_lines);
  // Keep primary guardian draft aligned with limited edit intake fields.
  const syncedGuardians = form.guardians.map((g) =>
    g.isPrimaryContact
      ? {
          ...g,
          name: form.guardian_name.trim() || g.name,
          phone: form.guardian_phone.trim() || g.phone,
          whatsapp: form.guardian_whatsapp.trim() || g.whatsapp,
          email: form.guardian_email.trim() || g.email,
          relationship: form.guardian_relationship || g.relationship,
        }
      : g,
  );
  const legacy = deriveLegacyGuardianFields(syncedGuardians);
  const guardians = serializeGuardiansPayload(syncedGuardians, { mode: 'individual' });

  const payload: PatchAdmissionPayload = {
    child_first_name_ar: form.child_first_name_ar.trim() || undefined,
    child_last_name_ar: form.child_last_name_ar.trim() || undefined,
    child_first_name_fr: form.child_first_name_fr.trim() || undefined,
    child_last_name_fr: form.child_last_name_fr.trim() || undefined,
    child_name: childName || undefined,
    student_name: childName || undefined,
    external_reference: form.external_reference.trim() || undefined,
    residence_address: composeResidenceAddress(form) || undefined,
    previous_school: form.previous_school.trim() || undefined,
    siblings_raw_text: form.siblings_raw_text.trim() || undefined,
    siblings_levels: form.siblings_levels.trim() || undefined,
    sibling_lines: siblingLines,
    internal_notes: form.internal_notes.trim() || undefined,
    academic_year_id: form.academic_year_id,
    source_id: form.source_id,
    requested_level_id: form.requested_level_id,
    guardian_phone: legacy.guardian_phone || form.guardian_phone.trim() || undefined,
    guardian_whatsapp: legacy.guardian_whatsapp || form.guardian_whatsapp.trim() || undefined,
    guardian_relationship: legacy.guardian_relationship || form.guardian_relationship || undefined,
    relationship: legacy.relationship || form.guardian_relationship || undefined,
    guardians,
    next_action: form.next_action.trim() || undefined,
    next_action_date: form.next_action_date || undefined,
  };

  if (baseline) {
    const baselineHasSiblings = parseExtraFieldBool(baseline.has_siblings);
    if (form.has_siblings !== baselineHasSiblings) {
      payload.has_siblings = form.has_siblings;
    }
  } else if (form.has_siblings) {
    payload.has_siblings = true;
  }

  for (const key of Object.keys(payload) as (keyof PatchAdmissionPayload)[]) {
    const val = payload[key];
    if (val === '' || val === undefined) delete payload[key];
  }

  const limited = filterLimitedPatchPayload(payload);
  if (!baseline) return limited;
  return diffLimitedPatchPayload(limited, buildPatchAdmissionPayload(baseline, levels));
}

export function mergeSelectedAcademicYear<T extends { id: number; name: string }>(
  years: T[],
  selectedId?: number,
  selectedName?: string,
): T[] {
  if (!selectedId || years.some((year) => year.id === selectedId)) return years;
  return [{ id: selectedId, name: selectedName || String(selectedId) } as T, ...years];
}

export function mergeSelectedAdmissionLevel(
  levels: AdmissionLevelOption[],
  selectedId?: number,
  selectedName?: string,
  cycleCode = '',
): AdmissionLevelOption[] {
  if (!selectedId || levels.some((level) => level.id === selectedId)) return levels;
  return [
    {
      id: selectedId,
      name: selectedName || String(selectedId),
      cycle: cycleCode,
      requires_stream: false,
    },
    ...levels,
  ];
}

export function mergeSelectedAdmissionCycle(
  cycles: { code: string; name: string }[],
  cycleCode?: string,
): { code: string; name: string }[] {
  if (!cycleCode || cycles.some((cycle) => cycle.code === cycleCode)) return cycles;
  return [{ code: cycleCode, name: cycleCode }, ...cycles];
}

export function mergeSelectedClassOption(
  classes: StudentClassOption[],
  selectedId?: number,
  selectedName?: string,
): StudentClassOption[] {
  if (!selectedId || classes.some((item) => item.id === selectedId)) return classes;
  const label = selectedName || String(selectedId);
  return [
    {
      id: selectedId,
      name: label,
      display_name: label,
    },
    ...classes,
  ];
}
