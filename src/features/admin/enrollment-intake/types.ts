import type { SiblingLine } from '@/types/sibling-line';

/** Canonical intake fields shared by admissions/new and students/new */
export interface EnrollmentIntakeValues {
  firstNameAr: string;
  lastNameAr: string;
  firstNameFr: string;
  lastNameFr: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  nationalityId: string;
  massarCode: string;
  schoolNumber: string;
  code: string;
  admissionDate: string;
  externalReference: string;
  residenceAddress: string;
  street: string;
  city: string;
  zip: string;
  previousSchool: string;
  admissionNotes: string;
  hasSiblings: boolean;
  siblingsRawText: string;
  siblingsLevels: string;
  siblingLines: SiblingLine[];
  academicYearId: string;
  cycleCode: string;
  cycleId: string;
  levelId: string;
  streamId: string;
  classId: string;
  registrationType: string;
  actualJoinDate: string;
  isRepeating: boolean;
  registrationNotes: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  guardianEmail: string;
  sourceId: string;
  firstContactDate: string;
  nextAction: string;
  nextActionDate: string;
}

export type EnrollmentIntakePatch = Partial<EnrollmentIntakeValues>;

export type EnrollmentIntakeFieldErrors = Partial<
  Record<
    | 'firstNameAr'
    | 'lastNameAr'
    | 'birthDate'
    | 'massarCode'
    | 'schoolNumber'
    | 'code'
    | 'academicYearId'
    | 'cycleId'
    | 'cycleCode'
    | 'levelId'
    | 'classId'
    | 'streamId'
    | 'actualJoinDate'
    | 'previousSchool'
    | 'email'
    | 'siblingLines',
    string
  >
>;
