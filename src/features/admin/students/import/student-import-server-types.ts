export const STUDENT_IMPORT_CAPABILITY = 'students.import' as const;

export type StudentImportServerIssueSource = 'local' | 'server';

export type StudentImportServerRowStatus = 'valid' | 'invalid' | 'warning' | 'failed';

export type StudentImportJobState =
  | 'validated'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

export type StudentImportExecuteState = StudentImportJobState;

export type StudentImportResultRowStatus =
  | 'created'
  | 'failed'
  | 'skipped_duplicate'
  | 'valid';

export type StudentImportFlowPhase =
  | 'idle'
  | 'file_loaded'
  | 'local_validating'
  | 'local_invalid'
  | 'local_valid'
  | 'server_validating'
  | 'server_invalid'
  | 'server_valid'
  | 'confirming'
  | 'executing'
  | 'polling'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

export type StudentImportFinalState = 'completed' | 'completed_with_errors' | 'failed';

export interface StudentImportCapability {
  can_import: boolean;
}

export interface StudentImportServerIssue {
  code: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  source: StudentImportServerIssueSource;
}

export interface StudentImportValidationRequestRow {
  row_number: number;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  first_name_fr?: string | null;
  last_name_fr?: string | null;
  name_ar?: string | null;
  name_latin?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  birth_place?: string | null;
  nationality_id?: number | null;
  massar_code?: string | null;
  school_number?: string;
  status?: string | null;
  admission_date?: string | null;
  school_id?: number;
  academic_year_id?: number;
  level_id?: number;
  class_id?: number;
  registration_type?: string;
  actual_join_date?: string | null;
  previous_school?: string | null;
  is_repeating?: boolean | null;
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

export interface StudentImportValidationRequest {
  template_version: number;
  active_school_id: number;
  source_filename: string;
  rows: StudentImportValidationRequestRow[];
}

export interface StudentImportJobSummary {
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  invalid_rows: number;
  created_rows?: number;
  failed_rows?: number;
  skipped_rows?: number;
}

export interface StudentImportServerRow {
  row_number: number;
  status: StudentImportServerRowStatus | StudentImportResultRowStatus | string;
  normalized?: Record<string, unknown>;
  errors: StudentImportServerIssue[];
  warnings: StudentImportServerIssue[];
  student_id?: number | null;
  enrollment_id?: number | null;
  school_number?: string | null;
  massar_code?: string | null;
  display_name?: string | null;
}

export interface StudentImportValidationResponse {
  job_id: number;
  validation_token: string | number;
  expires_at: string;
  summary: StudentImportJobSummary;
  rows: StudentImportServerRow[];
  capabilities: StudentImportCapability;
}

export interface StudentImportExecuteRequest {
  idempotency_key: string;
}

export interface StudentImportExecuteResponse {
  job_id: number;
  state: StudentImportExecuteState;
  summary: StudentImportJobSummary;
  rows: StudentImportServerRow[];
}

export interface StudentImportJobPagination {
  page?: number;
  limit: number;
  offset: number;
  total: number;
}

export interface StudentImportJob {
  id: number;
  state: StudentImportJobState;
  summary: StudentImportJobSummary;
  rows: StudentImportServerRow[];
  pagination: StudentImportJobPagination;
  capabilities?: { can_view?: boolean };
  expires_at?: string | null;
  source_filename?: string | null;
  template_version?: number | null;
  idempotency_key?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface StudentImportJobResponse {
  job: StudentImportJob;
}

export interface StudentImportMergedRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: import('./student-import-types').StudentImportNormalizedRow;
  localErrors: import('./student-import-types').StudentImportIssue[];
  localWarnings: import('./student-import-types').StudentImportIssue[];
  serverErrors: StudentImportServerIssue[];
  serverWarnings: StudentImportServerIssue[];
  serverStatus: StudentImportServerRowStatus | null;
  previewStatus: import('./student-import-types').StudentImportRowStatus;
  executable: boolean;
  resultStatus?: StudentImportResultRowStatus | string | null;
  studentId?: number | null;
  enrollmentId?: number | null;
  displayName?: string | null;
}

export interface StudentImportServerValidationState {
  jobId: number;
  validationToken: string | number;
  expiresAt: string;
  summary: StudentImportJobSummary;
  capabilities: StudentImportCapability;
  rows: StudentImportServerRow[];
}

export interface StudentImportExecutionState {
  jobId: number;
  state: StudentImportFinalState | StudentImportJobState;
  summary: StudentImportJobSummary;
  rows: StudentImportServerRow[];
  pagination: StudentImportJobPagination;
  sourceFilename?: string | null;
}
