import type { EnrollmentIntakePatch, EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { FamilyAdmissionChildFormState } from './family-admission-form-state';

export function intakeFromFamilyChild(child: FamilyAdmissionChildFormState): EnrollmentIntakeValues {
  return {
    firstNameAr: child.child_first_name_ar,
    lastNameAr: child.child_last_name_ar,
    firstNameFr: child.child_first_name_fr,
    lastNameFr: child.child_last_name_fr,
    gender: child.gender,
    birthDate: child.birth_date,
    birthPlace: '',
    nationalityId: '',
    massarCode: child.massar_code,
    schoolNumber: '',
    code: '',
    admissionDate: '',
    externalReference: child.external_reference,
    residenceAddress: child.residence_address,
    street: '',
    city: '',
    zip: '',
    previousSchool: child.previous_school,
    admissionNotes: '',
    hasSiblings: false,
    siblingsRawText: '',
    siblingsLevels: '',
    siblingLines: [],
    academicYearId: '',
    cycleCode: child.requested_cycle_code,
    cycleId: '',
    levelId: child.requested_level_id != null ? String(child.requested_level_id) : '',
    streamId: child.requested_stream_id != null ? String(child.requested_stream_id) : '',
    classId: '',
    registrationType: 'new',
    actualJoinDate: '',
    isRepeating: false,
    registrationNotes: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    guardianEmail: '',
    sourceId: '',
    firstContactDate: '',
    nextAction: '',
    nextActionDate: '',
  };
}

export function patchFamilyChildFromIntake(
  patch: EnrollmentIntakePatch,
): Partial<FamilyAdmissionChildFormState> {
  const next: Partial<FamilyAdmissionChildFormState> = {};
  if (patch.firstNameAr != null) next.child_first_name_ar = patch.firstNameAr;
  if (patch.lastNameAr != null) next.child_last_name_ar = patch.lastNameAr;
  if (patch.firstNameFr != null) next.child_first_name_fr = patch.firstNameFr;
  if (patch.lastNameFr != null) next.child_last_name_fr = patch.lastNameFr;
  if (patch.gender != null) next.gender = patch.gender;
  if (patch.birthDate != null) next.birth_date = patch.birthDate;
  if (patch.massarCode != null) next.massar_code = patch.massarCode;
  if (patch.previousSchool != null) next.previous_school = patch.previousSchool;
  if (patch.externalReference != null) next.external_reference = patch.externalReference;
  if (patch.residenceAddress != null) next.residence_address = patch.residenceAddress;
  if (patch.cycleCode != null) next.requested_cycle_code = patch.cycleCode;
  if (patch.levelId != null) {
    next.requested_level_id = patch.levelId ? Number(patch.levelId) : undefined;
  }
  if (patch.streamId != null) {
    next.requested_stream_id = patch.streamId ? Number(patch.streamId) : undefined;
  }
  return next;
}

export function familyChildDisplayName(child: FamilyAdmissionChildFormState): string {
  const ar = [child.child_first_name_ar.trim(), child.child_last_name_ar.trim()]
    .filter(Boolean)
    .join(' ');
  if (ar) return ar;
  const fr = [child.child_first_name_fr.trim(), child.child_last_name_fr.trim()]
    .filter(Boolean)
    .join(' ');
  return fr;
}
