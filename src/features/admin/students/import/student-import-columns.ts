import type { StudentImportColumn } from './student-import-types';

export const STUDENT_IMPORT_COLUMNS: StudentImportColumn[] = [
  { key: 'first_name', labelKey: 'admin.studentImport.columns.firstName', required: true, group: 'identity', commentKey: 'admin.studentImport.comments.firstName' },
  { key: 'last_name', labelKey: 'admin.studentImport.columns.lastName', required: true, group: 'identity', commentKey: 'admin.studentImport.comments.lastName' },
  { key: 'name_ar', labelKey: 'admin.studentImport.columns.nameAr', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.nameAr' },
  { key: 'name_latin', labelKey: 'admin.studentImport.columns.nameLatin', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.nameLatin' },
  { key: 'gender', labelKey: 'admin.studentImport.columns.gender', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.gender', hasDropdown: true },
  { key: 'date_of_birth', labelKey: 'admin.studentImport.columns.dateOfBirth', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.dateOfBirth', isDate: true },
  { key: 'birth_place', labelKey: 'admin.studentImport.columns.birthPlace', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.birthPlace' },
  { key: 'nationality_code', labelKey: 'admin.studentImport.columns.nationalityCode', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.nationalityCode', hasDropdown: true },
  { key: 'massar_code', labelKey: 'admin.studentImport.columns.massarCode', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.massarCode' },
  { key: 'school_number', labelKey: 'admin.studentImport.columns.schoolNumber', required: true, group: 'identity', commentKey: 'admin.studentImport.comments.schoolNumber' },
  { key: 'status', labelKey: 'admin.studentImport.columns.status', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.status', hasDropdown: true },
  { key: 'admission_date', labelKey: 'admin.studentImport.columns.admissionDate', required: false, group: 'identity', commentKey: 'admin.studentImport.comments.admissionDate', isDate: true },
  { key: 'school_code', labelKey: 'admin.studentImport.columns.schoolCode', required: true, group: 'enrollment', commentKey: 'admin.studentImport.comments.schoolCode', hasDropdown: true },
  { key: 'academic_year_code', labelKey: 'admin.studentImport.columns.academicYearCode', required: true, group: 'enrollment', commentKey: 'admin.studentImport.comments.academicYearCode', hasDropdown: true },
  { key: 'level_code', labelKey: 'admin.studentImport.columns.levelCode', required: true, group: 'enrollment', commentKey: 'admin.studentImport.comments.levelCode', hasDropdown: true },
  { key: 'class_code', labelKey: 'admin.studentImport.columns.classCode', required: true, group: 'enrollment', commentKey: 'admin.studentImport.comments.classCode', hasDropdown: true },
  { key: 'registration_type', labelKey: 'admin.studentImport.columns.registrationType', required: true, group: 'enrollment', commentKey: 'admin.studentImport.comments.registrationType', hasDropdown: true },
  { key: 'actual_join_date', labelKey: 'admin.studentImport.columns.actualJoinDate', required: false, group: 'enrollment', commentKey: 'admin.studentImport.comments.actualJoinDate', isDate: true },
  { key: 'previous_school', labelKey: 'admin.studentImport.columns.previousSchool', required: false, group: 'enrollment', commentKey: 'admin.studentImport.comments.previousSchool' },
  { key: 'is_repeating', labelKey: 'admin.studentImport.columns.isRepeating', required: false, group: 'enrollment', commentKey: 'admin.studentImport.comments.isRepeating', hasDropdown: true },
  { key: 'registration_notes', labelKey: 'admin.studentImport.columns.registrationNotes', required: false, group: 'enrollment', commentKey: 'admin.studentImport.comments.registrationNotes' },
  { key: 'phone', labelKey: 'admin.studentImport.columns.phone', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.phone' },
  { key: 'mobile', labelKey: 'admin.studentImport.columns.mobile', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.mobile' },
  { key: 'email', labelKey: 'admin.studentImport.columns.email', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.email' },
  { key: 'street', labelKey: 'admin.studentImport.columns.street', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.street' },
  { key: 'district', labelKey: 'admin.studentImport.columns.district', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.district' },
  { key: 'city', labelKey: 'admin.studentImport.columns.city', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.city' },
  { key: 'zip', labelKey: 'admin.studentImport.columns.zip', required: false, group: 'contact', commentKey: 'admin.studentImport.comments.zip' },
  { key: 'emergency_contact_name', labelKey: 'admin.studentImport.columns.emergencyContactName', required: false, group: 'emergency', commentKey: 'admin.studentImport.comments.emergencyContactName' },
  { key: 'emergency_relationship', labelKey: 'admin.studentImport.columns.emergencyRelationship', required: false, group: 'emergency', commentKey: 'admin.studentImport.comments.emergencyRelationship', hasDropdown: true },
  { key: 'emergency_phone', labelKey: 'admin.studentImport.columns.emergencyPhone', required: false, group: 'emergency', commentKey: 'admin.studentImport.comments.emergencyPhone' },
  { key: 'emergency_phone_alt', labelKey: 'admin.studentImport.columns.emergencyPhoneAlt', required: false, group: 'emergency', commentKey: 'admin.studentImport.comments.emergencyPhoneAlt' },
  { key: 'emergency_notes', labelKey: 'admin.studentImport.columns.emergencyNotes', required: false, group: 'emergency', commentKey: 'admin.studentImport.comments.emergencyNotes' },
  { key: 'departure_reason', labelKey: 'admin.studentImport.columns.departureReason', required: false, group: 'departure', commentKey: 'admin.studentImport.comments.departureReason' },
];

export const STUDENT_IMPORT_COLUMN_KEYS = STUDENT_IMPORT_COLUMNS.map((c) => c.key);

export const STUDENT_IMPORT_COLUMN_KEY_SET = new Set(STUDENT_IMPORT_COLUMN_KEYS);
