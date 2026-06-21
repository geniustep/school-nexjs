import type { AdmissionPrefill } from '@/types/admission';
import type { StudentProfileFormState } from '@/features/admin/students/utils/student-profile';
import { admissionDisplayReference } from './admission-registration';

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

export interface AdmissionRegistrationContext {
  admissionId: number;
  reference: string;
  decision?: string | null;
  offerState?: string | null;
  warnings?: string[];
  blockingIssues?: string[];
}

export function buildAdmissionRegistrationContext(
  admissionId: number,
  prefill: AdmissionPrefill,
  reference?: string | null,
): AdmissionRegistrationContext {
  const admission = (prefill.admission ?? {}) as Record<string, unknown>;
  const source = (prefill.source ?? {}) as Record<string, unknown>;
  return {
    admissionId,
    reference:
      reference?.trim() ||
      str(source.admission_name) ||
      str(admission.reference) ||
      `#${admissionId}`,
    decision: str(admission.decision) || str(prefill.readiness && (prefill.readiness as Record<string, unknown>).decision) || null,
    offerState: str(admission.offer_state) || null,
    warnings: prefill.warnings ?? [],
    blockingIssues: prefill.blocking_issues ?? [],
  };
}

export function mapAdmissionPrefillToStudentProfile(
  prefill: AdmissionPrefill,
): Partial<StudentProfileFormState> {
  const student = (prefill.student ?? {}) as Record<string, unknown>;
  const guardian = (prefill.guardian ?? {}) as Record<string, unknown>;
  const academic = (prefill.academic ?? {}) as Record<string, unknown>;
  const admission = (prefill.admission ?? {}) as Record<string, unknown>;

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

  const guardianNotes = buildGuardianNotes(guardian);
  const registrationNotes = [buildRegistrationNotes(admission), guardianNotes].filter(Boolean).join('\n');

  return {
    firstName,
    lastName,
    firstNameLatin,
    lastNameLatin,
    nameAr: str(student.name_ar) || str(student.child_full_name) || str(student.student_name),
    nameLatin: str(student.name_latin),
    gender: str(student.gender),
    dateOfBirth: str(student.birth_date),
    massarCode: str(student.massar_code),
    previousSchool: str(student.previous_school),
    schoolId: idStr(academic.school_id),
    academicYearId: idStr(academic.academic_year_id),
    levelId: idStr(academic.requested_level_id),
    classId: idStr(academic.requested_class_id),
    emergencyContactName: str(guardian.name),
    emergencyPhone: str(guardian.phone),
    emergencyRelationship: str(guardian.relationship) || str(guardian.guardian_relationship),
    emergencyNotes: guardianNotes,
    mobile: str(guardian.phone),
    email: str(guardian.email),
    registrationNotes,
  };
}

export function admissionPrefillReferenceLabel(
  context: AdmissionRegistrationContext,
  detail?: { id: number; reference?: string | null; name?: string | null },
): string {
  if (detail) return admissionDisplayReference(detail);
  return context.reference;
}
