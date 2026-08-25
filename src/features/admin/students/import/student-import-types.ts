import type { STUDENT_IMPORT_TEMPLATE_VERSION } from './student-import-constants';

export type StudentImportTemplateVersion = typeof STUDENT_IMPORT_TEMPLATE_VERSION;

export type StudentImportPreviewFilter = 'all' | 'valid' | 'warning' | 'invalid';

export type StudentImportRowStatus = 'valid' | 'warning' | 'invalid';

export type StudentImportIssueSeverity = 'error' | 'warning';

export interface StudentImportColumn {
  key: string;
  labelKey: string;
  required: boolean;
  group: 'identity' | 'enrollment' | 'contact' | 'emergency' | 'departure';
  commentKey: string;
  hasDropdown?: boolean;
  isDate?: boolean;
}

export interface StudentImportRow {
  first_name?: string | null;
  last_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  first_name_fr?: string | null;
  last_name_fr?: string | null;
  name_ar?: string | null;
  name_latin?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  birth_place?: string | null;
  nationality_code?: string | null;
  massar_code?: string | null;
  school_number?: string | null;
  status?: string | null;
  admission_date?: string | null;
  school_code?: string | null;
  academic_year_code?: string | null;
  level_code?: string | null;
  class_code?: string | null;
  registration_type?: string | null;
  actual_join_date?: string | null;
  previous_school?: string | null;
  is_repeating?: string | null;
  registration_notes?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  zip?: string | null;
  emergency_contact_name?: string | null;
  emergency_relationship?: string | null;
  emergency_phone?: string | null;
  emergency_phone_alt?: string | null;
  emergency_notes?: string | null;
  departure_reason?: string | null;
}

export interface StudentImportNormalizedRow extends Omit<StudentImportRow, 'is_repeating'> {
  is_repeating?: boolean | null;
  nationality_id?: number | null;
  school_id?: number | null;
  academic_year_id?: number | null;
  level_id?: number | null;
  class_id?: number | null;
  guardian_id?: number | null;
  guardian_name?: string | null;
  guardian_first_name_ar?: string | null;
  guardian_last_name_ar?: string | null;
  guardian_first_name_fr?: string | null;
  guardian_last_name_fr?: string | null;
  guardian_mobile?: string | null;
  guardian_relationship_type?: string | null;
  guardian_is_legal_guardian?: boolean | null;
  guardian_is_primary_contact?: boolean | null;
  guardian_is_financial_responsible?: boolean | null;
}

export type StudentImportTemplateFormat = 'legacy_raqeem' | 'odoo_v1';

export interface StudentImportMetaV1Snapshot {
  templateVersion: number | null;
  importMode: string | null;
  schoolId: number | null;
  schoolName: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
}

export interface StudentImportIssue {
  code: string;
  field?: string;
  message: string;
  severity: StudentImportIssueSeverity;
}

export interface StudentImportRowResult {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: StudentImportNormalizedRow;
  errors: StudentImportIssue[];
  warnings: StudentImportIssue[];
  status: StudentImportRowStatus;
}

export interface StudentImportSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  totalErrors: number;
  totalWarnings: number;
}

export interface StudentImportValidationResult {
  templateVersion: StudentImportTemplateVersion | null;
  importMode?: string | null;
  format?: StudentImportTemplateFormat;
  meta?: StudentImportMetaV1Snapshot | null;
  fileErrors: StudentImportIssue[];
  rows: StudentImportRowResult[];
  summary: StudentImportSummary;
  readyForImport: boolean;
}

export interface StudentImportReferenceSchool {
  id: number;
  name: string;
  code: string;
}

export interface StudentImportReferenceAcademicYear {
  id: number;
  name: string;
  code: string;
}

export interface StudentImportReferenceLevel {
  id: number;
  name: string;
  code: string;
  schoolId: number | null;
  academicYearId: number | null;
}

export interface StudentImportReferenceClass {
  id: number;
  name: string;
  code: string;
  schoolId: number | null;
  academicYearId: number | null;
  levelId: number | null;
}

export interface StudentImportReferenceData {
  genders: Set<string>;
  studentStatuses: Set<string>;
  registrationTypes: Set<string>;
  emergencyRelationships: Set<string>;
  nationalities: Map<string, number>;
  schools: Map<string, StudentImportReferenceSchool>;
  academicYears: Map<string, StudentImportReferenceAcademicYear>;
  levels: Map<string, StudentImportReferenceLevel>;
  classes: Map<string, StudentImportReferenceClass>;
}

export interface StudentImportTemplateMetadata {
  version: StudentImportTemplateVersion;
  generatedAt: string;
  locale: string;
}

export interface StudentImportParseResult {
  templateVersion: StudentImportTemplateVersion | null;
  importMode?: string | null;
  format?: StudentImportTemplateFormat;
  meta?: StudentImportMetaV1Snapshot | null;
  headers: string[];
  rows: Array<{ rowNumber: number; raw: Record<string, unknown> }>;
  fileErrors: StudentImportIssue[];
}

export interface StudentImportTemplateLabels {
  columns: Record<string, string>;
  comments: Record<string, string>;
  instructions: {
    title: string;
    purpose: string;
    howToFill: string;
    requiredFields: string;
    optionalFields: string;
    dateFormat: string;
    allowedValues: string;
    doNotRenameColumns: string;
    noFormulas: string;
    noMergeCells: string;
    doNotDeleteSheets: string;
    maxRows: string;
    excludedData: string;
    previewNote: string;
    classConsistency: string;
    booleanValues: string;
    templateVersionLabel: string;
    exampleNote: string;
  };
  exampleRows: StudentImportRow[];
}
