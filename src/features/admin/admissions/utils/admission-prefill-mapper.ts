import type { AdmissionPrefill } from '@/types/admission';
import type { StudentProfileFormState } from '@/features/admin/students/utils/student-profile';
import { admissionDisplayReference } from './admission-registration';

import { parseExtraFieldBool } from './admission-extra-fields';
import { normalizeSiblingLines } from './sibling-lines';
import { normalizeMassarCodeInput } from '@/features/admin/students/utils/massar-code';

function str(value: unknown): string {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function idStr(value: unknown): string {
  if (value == null || value === false) return '';
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return String(value);
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === 'number' && Number.isFinite(id) && id > 0) return String(id);
  }
  const raw = str(value);
  return /^\d+$/.test(raw) ? raw : '';
}

function positiveId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return n > 0 ? n : null;
  }
  return null;
}

function splitStudentName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildRegistrationNotes(admission: Record<string, unknown> | null | undefined): string {
  if (!admission) return '';
  const lines: string[] = [];
  const docs = str(admission.required_documents);
  if (docs) lines.push(docs);
  const conditions = str(admission.conditions);
  if (conditions) lines.push(conditions);
  return lines.join('\n');
}

function buildGuardianNotes(guardian: Record<string, unknown> | null | undefined): string {
  if (!guardian) return '';
  const lines: string[] = [];
  const email = str(guardian.email);
  if (email) lines.push(email);
  const whatsapp = str(guardian.whatsapp);
  const phone = str(guardian.phone);
  if (whatsapp && whatsapp !== phone) lines.push(whatsapp);
  return lines.join('\n');
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => str(item))
    .filter(Boolean);
}

/** Textual guardian snapshot from admission — never an identity key. */
export interface AdmissionGuardianPrefillText {
  name: string;
  phone: string;
  relationship: string;
  email: string;
  notes: string;
}

export interface AdmissionGuardianSelectionView {
  selectionRequired: boolean;
  isExistingGuardianSelected: boolean;
  hasBoundGuardian: boolean;
  guardianId: number | null;
  warningCodes: string[];
  prefillSource: string | null;
}

export interface AdmissionRegistrationContext {
  admissionId: number;
  reference: string;
  decision?: string | null;
  offerState?: string | null;
  warnings?: string[];
  blockingIssues?: string[];
  guardianSelection: AdmissionGuardianSelectionView;
  guardianPrefillText: AdmissionGuardianPrefillText;
}

export function extractAdmissionGuardianPrefillText(
  prefill: AdmissionPrefill,
): AdmissionGuardianPrefillText {
  const guardian = (prefill.guardian ?? {}) as Record<string, unknown>;
  return {
    name: str(guardian.name),
    phone: str(guardian.phone),
    relationship: str(guardian.relationship) || str(guardian.guardian_relationship),
    email: str(guardian.email),
    notes: buildGuardianNotes(guardian),
  };
}

export function resolveAdmissionGuardianSelection(
  prefill: AdmissionPrefill,
): AdmissionGuardianSelectionView {
  const nested = prefill.guardian_selection ?? null;
  const warningCodes = [
    ...asStringList(prefill.warning_codes),
    ...asStringList(nested?.warning_codes),
    ...(prefill.warnings ?? []).map((w) => str(w)).filter(Boolean),
  ];

  const guardianId =
    positiveId(nested?.guardian_id) ??
    positiveId(prefill.guardian_id) ??
    positiveId((prefill.guardian as Record<string, unknown> | null | undefined)?.guardian_id) ??
    positiveId((prefill.guardian as Record<string, unknown> | null | undefined)?.id);

  const hasBoundGuardian =
    nested?.has_bound_guardian === true ||
    prefill.has_guardian_id === true ||
    guardianId != null;

  const isExistingGuardianSelected =
    nested?.is_existing_guardian_selected === true ||
    prefill.is_existing_guardian_selected === true ||
    hasBoundGuardian;

  const selectionRequiredExplicit =
    nested?.selection_required === true ||
    nested?.requires_selection === true ||
    prefill.selection_required === true ||
    prefill.requires_selection === true ||
    warningCodes.includes('guardian_selection_required');

  const selectionRequired =
    selectionRequiredExplicit || (!isExistingGuardianSelected && Boolean(extractAdmissionGuardianPrefillText(prefill).name));

  return {
    selectionRequired: isExistingGuardianSelected ? false : selectionRequired,
    isExistingGuardianSelected,
    hasBoundGuardian,
    guardianId: isExistingGuardianSelected ? guardianId : null,
    warningCodes: [...new Set(warningCodes)],
    prefillSource: str(nested?.prefill_source) || null,
  };
}

/**
 * Text prefill is not a selected existing guardian.
 * Only apply guardian fields to the profile when Backend already bound a guardian_id.
 */
export function shouldApplyGuardianPrefillToProfile(
  selection: AdmissionGuardianSelectionView,
): boolean {
  return selection.isExistingGuardianSelected && selection.guardianId != null;
}

export function guardianPrefillTextToProfilePatch(
  text: AdmissionGuardianPrefillText,
): Partial<StudentProfileFormState> {
  return {
    emergencyContactName: text.name,
    emergencyPhone: text.phone,
    emergencyRelationship: text.relationship,
    emergencyNotes: text.notes,
    guardianEmail: text.email,
  };
}

export function buildAdmissionRegistrationContext(
  admissionId: number,
  prefill: AdmissionPrefill,
  reference?: string | null,
): AdmissionRegistrationContext {
  const admission = (prefill.admission ?? {}) as Record<string, unknown>;
  const source = (prefill.source ?? {}) as Record<string, unknown>;
  const guardianSelection = resolveAdmissionGuardianSelection(prefill);
  const guardianPrefillText = extractAdmissionGuardianPrefillText(prefill);

  const warnings = [
    ...(prefill.warnings ?? []),
    ...(guardianSelection.selectionRequired && !guardianSelection.warningCodes.includes('guardian_selection_required')
      ? ['guardian_selection_required']
      : []),
  ];

  return {
    admissionId,
    reference:
      reference?.trim() ||
      str(source.admission_name) ||
      str(admission.reference) ||
      `#${admissionId}`,
    decision: str(admission.decision) || str(prefill.readiness && (prefill.readiness as Record<string, unknown>).decision) || null,
    offerState: str(admission.offer_state) || null,
    warnings,
    blockingIssues: prefill.blocking_issues ?? [],
    guardianSelection,
    guardianPrefillText,
  };
}

export function mapAdmissionPrefillToStudentProfile(
  prefill: AdmissionPrefill,
): Partial<StudentProfileFormState> {
  const student = (prefill.student ?? {}) as Record<string, unknown>;
  const academic = (prefill.academic ?? {}) as Record<string, unknown>;
  const admission = (prefill.admission ?? {}) as Record<string, unknown>;
  const selection = resolveAdmissionGuardianSelection(prefill);

  let firstName = str(student.child_first_name_ar) || str(student.first_name_ar);
  let lastName = str(student.child_last_name_ar) || str(student.last_name_ar);
  let firstNameLatin = str(student.child_first_name_fr);
  let lastNameLatin = str(student.child_last_name_fr);

  if (!firstNameLatin && !lastNameLatin) {
    firstNameLatin = str(student.first_name);
    lastNameLatin = str(student.last_name);
  }

  if (!firstName && !lastName) {
    const nameAr = str(student.name_ar) || str(student.student_name) || str(student.child_full_name);
    const fromAr = splitStudentName(nameAr);
    firstName = fromAr.firstName;
    lastName = fromAr.lastName;
  }

  if (!firstNameLatin && !lastNameLatin) {
    const fromLatin = splitStudentName(str(student.name_latin));
    firstNameLatin = fromLatin.firstName;
    lastNameLatin = fromLatin.lastName;
  }

  const prefillRegistrationNotes = str(admission.registration_notes);

  const patch: Partial<StudentProfileFormState> = {
    firstName,
    lastName,
    firstNameLatin,
    lastNameLatin,
    nameAr: str(student.name_ar) || str(student.child_full_name) || str(student.student_name),
    nameLatin: str(student.name_latin),
    gender: str(student.gender),
    dateOfBirth: str(student.birth_date),
    birthPlace: str(student.birth_place),
    nationalityId: idStr(student.nationality_id),
    massarCode: normalizeMassarCodeInput(str(student.massar_code)),
    schoolNumber: str(student.school_number),
    code: str(student.code),
    admissionDate: str(student.admission_date) || str(admission.admission_date),
    previousSchool: str(student.previous_school),
    externalReference: str(student.external_reference),
    residenceAddress: str(student.residence_address),
    hasSiblings:
      parseExtraFieldBool(student.has_siblings) || parseExtraFieldBool(admission.has_siblings),
    siblingsLevels: str(student.siblings_levels) || str(admission.siblings_levels),
    siblingsRawText: str(student.siblings_raw_text) || str(admission.siblings_raw_text),
    siblingLines: normalizeSiblingLines(student.sibling_lines ?? admission.sibling_lines),
    admissionNotes:
      str(student.admission_notes) ||
      str(admission.internal_notes) ||
      buildRegistrationNotes(admission),
    schoolId: idStr(academic.school_id),
    academicYearId: idStr(academic.academic_year_id),
    levelId: idStr(academic.requested_level_id),
    streamId: idStr(academic.requested_stream_id),
    classId: idStr(academic.requested_class_id),
    registrationType: str(admission.registration_type) || 'new',
    actualJoinDate:
      str(admission.actual_join_date) ||
      str(student.admission_date) ||
      str(admission.admission_date),
    isRepeating: parseExtraFieldBool(admission.is_repeating),
    registrationNotes: prefillRegistrationNotes,
    sourceId: idStr(admission.source_id),
    firstContactDate: str(admission.first_contact_date),
    nextAction: str(admission.next_action),
    nextActionDate: str(admission.next_action_date),
  };

  if (shouldApplyGuardianPrefillToProfile(selection)) {
    Object.assign(patch, guardianPrefillTextToProfilePatch(extractAdmissionGuardianPrefillText(prefill)));
  }

  return patch;
}

export function admissionPrefillReferenceLabel(
  context: AdmissionRegistrationContext,
  detail?: { id: number; reference?: string | null; name?: string | null },
): string {
  if (detail) return admissionDisplayReference(detail);
  return context.reference;
}
