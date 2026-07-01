import type { AdmissionCreateFormState } from '@/features/admin/admissions/utils/admission-create-payload';
import type {
  StudentProfileFieldErrors,
  StudentProfileFormState,
} from '@/features/admin/students/utils/student-profile';
import type { EnrollmentIntakeFieldErrors, EnrollmentIntakePatch, EnrollmentIntakeValues } from './types';

export function intakeErrorsFromStudentProfile(
  errors: StudentProfileFieldErrors,
): EnrollmentIntakeFieldErrors {
  return {
    firstNameAr: errors.firstName,
    lastNameAr: errors.lastName,
    birthDate: errors.dateOfBirth,
    massarCode: errors.massarCode,
    schoolNumber: errors.schoolNumber,
    code: errors.code,
    academicYearId: errors.academicYearId,
    cycleId: errors.cycleId,
    levelId: errors.levelId,
    classId: errors.classId,
    actualJoinDate: errors.actualJoinDate,
    previousSchool: errors.previousSchool,
    email: errors.email,
    siblingLines: errors.siblingLines,
  };
}

export function intakeFromAdmissionForm(form: AdmissionCreateFormState): EnrollmentIntakeValues {
  return {
    firstNameAr: form.child_first_name_ar,
    lastNameAr: form.child_last_name_ar,
    firstNameFr: form.child_first_name_fr,
    lastNameFr: form.child_last_name_fr,
    gender: form.gender,
    birthDate: form.birth_date,
    birthPlace: form.birth_place,
    nationalityId: form.nationality_id != null ? String(form.nationality_id) : '',
    massarCode: form.massar_code,
    schoolNumber: form.school_number,
    code: form.code,
    admissionDate: form.admission_date,
    externalReference: form.external_reference,
    residenceAddress: form.residence_address,
    street: form.street,
    city: form.city,
    zip: form.zip,
    previousSchool: form.previous_school,
    admissionNotes: form.internal_notes,
    hasSiblings: form.has_siblings,
    siblingsRawText: form.siblings_raw_text,
    siblingsLevels: form.siblings_levels,
    siblingLines: form.sibling_lines,
    academicYearId: form.academic_year_id != null ? String(form.academic_year_id) : '',
    cycleCode: form.requested_cycle_code,
    cycleId: '',
    levelId: form.requested_level_id != null ? String(form.requested_level_id) : '',
    streamId: form.requested_stream_id != null ? String(form.requested_stream_id) : '',
    classId: form.requested_class_id != null ? String(form.requested_class_id) : '',
    registrationType: form.registration_type,
    actualJoinDate: form.actual_join_date,
    isRepeating: form.is_repeating,
    registrationNotes: form.registration_notes,
    guardianName: form.guardian_name,
    guardianPhone: form.guardian_phone,
    guardianRelationship: form.guardian_relationship,
    guardianEmail: form.guardian_email,
    sourceId: form.source_id != null ? String(form.source_id) : '',
    firstContactDate: form.first_contact_date,
    nextAction: form.next_action,
    nextActionDate: form.next_action_date,
  };
}

export function patchAdmissionFormFromIntake(
  patch: EnrollmentIntakePatch,
): Partial<AdmissionCreateFormState> {
  const next: Partial<AdmissionCreateFormState> = {};
  if (patch.firstNameAr != null) next.child_first_name_ar = patch.firstNameAr;
  if (patch.lastNameAr != null) next.child_last_name_ar = patch.lastNameAr;
  if (patch.firstNameFr != null) next.child_first_name_fr = patch.firstNameFr;
  if (patch.lastNameFr != null) next.child_last_name_fr = patch.lastNameFr;
  if (patch.gender != null) next.gender = patch.gender;
  if (patch.birthDate != null) next.birth_date = patch.birthDate;
  if (patch.birthPlace != null) next.birth_place = patch.birthPlace;
  if (patch.nationalityId != null) {
    next.nationality_id = patch.nationalityId ? Number(patch.nationalityId) : undefined;
  }
  if (patch.massarCode != null) next.massar_code = patch.massarCode;
  if (patch.schoolNumber != null) next.school_number = patch.schoolNumber;
  if (patch.code != null) next.code = patch.code;
  if (patch.admissionDate != null) next.admission_date = patch.admissionDate;
  if (patch.externalReference != null) next.external_reference = patch.externalReference;
  if (patch.residenceAddress != null) next.residence_address = patch.residenceAddress;
  if (patch.street != null) next.street = patch.street;
  if (patch.city != null) next.city = patch.city;
  if (patch.zip != null) next.zip = patch.zip;
  if (patch.previousSchool != null) next.previous_school = patch.previousSchool;
  if (patch.admissionNotes != null) next.internal_notes = patch.admissionNotes;
  if (patch.hasSiblings != null) next.has_siblings = patch.hasSiblings;
  if (patch.siblingsRawText != null) next.siblings_raw_text = patch.siblingsRawText;
  if (patch.siblingsLevels != null) next.siblings_levels = patch.siblingsLevels;
  if (patch.siblingLines != null) next.sibling_lines = patch.siblingLines;
  if (patch.academicYearId != null) {
    next.academic_year_id = patch.academicYearId ? Number(patch.academicYearId) : undefined;
  }
  if (patch.cycleCode != null) next.requested_cycle_code = patch.cycleCode;
  if (patch.levelId != null) {
    next.requested_level_id = patch.levelId ? Number(patch.levelId) : undefined;
  }
  if (patch.streamId != null) {
    next.requested_stream_id = patch.streamId ? Number(patch.streamId) : undefined;
  }
  if (patch.classId != null) {
    next.requested_class_id = patch.classId ? Number(patch.classId) : undefined;
  }
  if (patch.registrationType != null) next.registration_type = patch.registrationType;
  if (patch.actualJoinDate != null) next.actual_join_date = patch.actualJoinDate;
  if (patch.isRepeating != null) next.is_repeating = patch.isRepeating;
  if (patch.registrationNotes != null) next.registration_notes = patch.registrationNotes;
  if (patch.guardianName != null) next.guardian_name = patch.guardianName;
  if (patch.guardianPhone != null) next.guardian_phone = patch.guardianPhone;
  if (patch.guardianRelationship != null) next.guardian_relationship = patch.guardianRelationship;
  if (patch.guardianEmail != null) next.guardian_email = patch.guardianEmail;
  if (patch.sourceId != null) next.source_id = patch.sourceId ? Number(patch.sourceId) : undefined;
  if (patch.firstContactDate != null) next.first_contact_date = patch.firstContactDate;
  if (patch.nextAction != null) next.next_action = patch.nextAction;
  if (patch.nextActionDate != null) next.next_action_date = patch.nextActionDate;
  return next;
}

export function intakeFromStudentProfile(state: StudentProfileFormState): EnrollmentIntakeValues {
  return {
    firstNameAr: state.firstName,
    lastNameAr: state.lastName,
    firstNameFr: state.firstNameLatin,
    lastNameFr: state.lastNameLatin,
    gender: state.gender,
    birthDate: state.dateOfBirth,
    birthPlace: state.birthPlace,
    nationalityId: state.nationalityId,
    massarCode: state.massarCode,
    schoolNumber: state.schoolNumber,
    code: state.code,
    admissionDate: state.admissionDate,
    externalReference: state.externalReference,
    residenceAddress: state.residenceAddress,
    street: state.street,
    city: state.city,
    zip: state.zip,
    previousSchool: state.previousSchool,
    admissionNotes: state.admissionNotes,
    hasSiblings: state.hasSiblings,
    siblingsRawText: state.siblingsRawText,
    siblingsLevels: state.siblingsLevels,
    siblingLines: state.siblingLines,
    academicYearId: state.academicYearId,
    cycleCode: '',
    cycleId: state.cycleId,
    levelId: state.levelId,
    streamId: state.streamId,
    classId: state.classId,
    registrationType: state.registrationType,
    actualJoinDate: state.actualJoinDate,
    isRepeating: state.isRepeating,
    registrationNotes: state.registrationNotes,
    guardianName: state.emergencyContactName,
    guardianPhone: state.emergencyPhone,
    guardianRelationship: state.emergencyRelationship,
    guardianEmail: state.guardianEmail,
    sourceId: state.sourceId,
    firstContactDate: state.firstContactDate,
    nextAction: state.nextAction,
    nextActionDate: state.nextActionDate,
  };
}

export function patchStudentProfileFromIntake(
  patch: EnrollmentIntakePatch,
): Partial<StudentProfileFormState> {
  const next: Partial<StudentProfileFormState> = {};
  if (patch.firstNameAr != null) next.firstName = patch.firstNameAr;
  if (patch.lastNameAr != null) next.lastName = patch.lastNameAr;
  if (patch.firstNameFr != null) next.firstNameLatin = patch.firstNameFr;
  if (patch.lastNameFr != null) next.lastNameLatin = patch.lastNameFr;
  if (patch.gender != null) next.gender = patch.gender;
  if (patch.birthDate != null) next.dateOfBirth = patch.birthDate;
  if (patch.birthPlace != null) next.birthPlace = patch.birthPlace;
  if (patch.nationalityId != null) next.nationalityId = patch.nationalityId;
  if (patch.massarCode != null) next.massarCode = patch.massarCode;
  if (patch.schoolNumber != null) next.schoolNumber = patch.schoolNumber;
  if (patch.code != null) next.code = patch.code;
  if (patch.admissionDate != null) next.admissionDate = patch.admissionDate;
  if (patch.externalReference != null) next.externalReference = patch.externalReference;
  if (patch.residenceAddress != null) next.residenceAddress = patch.residenceAddress;
  if (patch.street != null) next.street = patch.street;
  if (patch.city != null) next.city = patch.city;
  if (patch.zip != null) next.zip = patch.zip;
  if (patch.previousSchool != null) next.previousSchool = patch.previousSchool;
  if (patch.admissionNotes != null) next.admissionNotes = patch.admissionNotes;
  if (patch.hasSiblings != null) next.hasSiblings = patch.hasSiblings;
  if (patch.siblingsRawText != null) next.siblingsRawText = patch.siblingsRawText;
  if (patch.siblingsLevels != null) next.siblingsLevels = patch.siblingsLevels;
  if (patch.siblingLines != null) next.siblingLines = patch.siblingLines;
  if (patch.academicYearId != null) next.academicYearId = patch.academicYearId;
  if (patch.cycleId != null) next.cycleId = patch.cycleId;
  if (patch.levelId != null) next.levelId = patch.levelId;
  if (patch.streamId != null) next.streamId = patch.streamId;
  if (patch.classId != null) next.classId = patch.classId;
  if (patch.registrationType != null) next.registrationType = patch.registrationType;
  if (patch.actualJoinDate != null) next.actualJoinDate = patch.actualJoinDate;
  if (patch.isRepeating != null) next.isRepeating = patch.isRepeating;
  if (patch.registrationNotes != null) next.registrationNotes = patch.registrationNotes;
  if (patch.guardianName != null) next.emergencyContactName = patch.guardianName;
  if (patch.guardianPhone != null) next.emergencyPhone = patch.guardianPhone;
  if (patch.guardianRelationship != null) next.emergencyRelationship = patch.guardianRelationship;
  if (patch.guardianEmail != null) next.guardianEmail = patch.guardianEmail;
  if (patch.sourceId != null) next.sourceId = patch.sourceId;
  if (patch.firstContactDate != null) next.firstContactDate = patch.firstContactDate;
  if (patch.nextAction != null) next.nextAction = patch.nextAction;
  if (patch.nextActionDate != null) next.nextActionDate = patch.nextActionDate;
  return next;
}
