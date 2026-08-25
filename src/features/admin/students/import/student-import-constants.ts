export const STUDENT_IMPORT_TEMPLATE_VERSION = 1 as const;

export const STUDENT_IMPORT_TEMPLATE_FILENAME = 'raqeem-students-import-template.xlsx';

export const STUDENT_IMPORT_ERROR_REPORT_FILENAME = 'student-import-validation-report.xlsx';

export const STUDENT_IMPORT_MAX_ROWS = 500;

export const STUDENT_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const STUDENT_IMPORT_ACCEPTED_EXTENSION = '.xlsx';

export const STUDENT_IMPORT_SHEET_INSTRUCTIONS = 'Instructions';

export const STUDENT_IMPORT_SHEET_META = '_SSC_Meta';

export const STUDENT_IMPORT_SHEET_STUDENTS = 'Students';

export const STUDENT_IMPORT_V1_HEADER_ROW = 1;

export const STUDENT_IMPORT_V1_EXAMPLE_ROW = 2;

export const STUDENT_IMPORT_V1_DATA_START_ROW = 3;

export const STUDENT_IMPORT_V1_USER_COLUMNS = [
  'row_number',
  'school_number',
  'school_label',
  'first_name',
  'last_name',
  'first_name_ar',
  'last_name_ar',
  'first_name_fr',
  'last_name_fr',
  'massar_code',
  'gender',
  'date_of_birth',
  'academic_year_label',
  'level_label',
  'class_label',
  'registration_type',
  'previous_school',
  'guardian_pick',
  'guardian_name',
  'guardian_first_name_ar',
  'guardian_last_name_ar',
  'guardian_first_name_fr',
  'guardian_last_name_fr',
  'guardian_mobile',
  'guardian_relationship_type',
  'guardian_is_legal_guardian',
  'guardian_is_primary_contact',
  'guardian_is_financial_responsible',
] as const;

export const STUDENT_IMPORT_V1_ID_COLUMNS = [
  'school_id',
  'academic_year_id',
  'level_id',
  'class_id',
  'guardian_id',
] as const;

export const STUDENT_IMPORT_V1_REQUIRED_HEADERS = [
  'row_number',
  'first_name',
  'last_name',
  'class_label',
] as const;

export const STUDENT_IMPORT_V1_REQUIRED_ROW_FIELDS = [
  'first_name',
  'last_name',
  'class_id',
  'registration_type',
  'guardian_name',
  'guardian_mobile',
] as const;

export const STUDENT_IMPORT_SHEET_REFERENCE = 'Reference';

export const STUDENT_IMPORT_SHEET_EXAMPLE = 'Example';

export const STUDENT_IMPORT_HEADER_LABEL_ROW = 1;

export const STUDENT_IMPORT_HEADER_KEY_ROW = 2;

export const STUDENT_IMPORT_DATA_START_ROW = 3;

export const STUDENT_IMPORT_TEMPLATE_VERSION_CELL = 'B2';

export const STUDENT_IMPORT_REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'school_number',
  'school_code',
  'academic_year_code',
  'level_code',
  'class_code',
  'registration_type',
] as const;

export const STUDENT_IMPORT_BOOLEAN_YES_VALUES = new Set(['yes', 'true', '1', 'oui', 'نعم']);

export const STUDENT_IMPORT_BOOLEAN_NO_VALUES = new Set(['no', 'false', '0', 'non', 'لا']);