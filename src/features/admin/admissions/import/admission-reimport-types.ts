import type { SiblingLine } from '@/types/sibling-line';

/** Raw row from reimport spreadsheet (column keys as in file). */
export interface AdmissionReimportRawRow {
  row_number: number;
  external_reference?: string | null;
  academic_year?: string | null;
  application_status?: string | null;
  admission_source?: string | null;
  target_level_code?: string | null;
  student_first_name_ar?: string | null;
  student_last_name_ar?: string | null;
  student_full_name_ar?: string | null;
  student_first_name_latin?: string | null;
  student_last_name_latin?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_whatsapp?: string | null;
  guardian_phone_secondary?: string | null;
  previous_school?: string | null;
  current_school?: string | null;
  residence_address?: string | null;
  address?: string | null;
  has_siblings?: string | boolean | number | null;
  siblings_levels?: string | null;
  siblings_raw_text?: string | null;
  sibling_lines_json?: string | null;
  internal_notes?: string | null;
  notes?: string | null;
  /** Review-only — never sent to API */
  raw_phone?: string | null;
  quality_status?: string | null;
  review_flags?: string | null;
  source_sheet?: string | null;
  source_row?: string | null;
  target_level_label?: string | null;
}

export type AdmissionReimportMode = 'import' | 'upsert';

export interface AdmissionReimportOptions {
  mode: AdmissionReimportMode;
  /** When true, same as mode=upsert */
  reimport?: boolean;
  dryRun?: boolean;
  /** Limit rows for sample run (execute only) */
  sampleSize?: number;
  /** Allow POST for rows with external_reference not found (default false in upsert) */
  allowCreate?: boolean;
}

export interface AdmissionExistingRef {
  id: number;
  external_reference: string;
  reference?: string | null;
}

export interface AdmissionReimportReferenceLookup {
  academicYears: Map<string, number>;
  sources: Map<string, number>;
  levels: Map<string, number>;
}

export interface AdmissionReimportRowWarning {
  row_number: number;
  external_reference?: string;
  code: string;
  message: string;
}

export type AdmissionReimportRowAction =
  | { kind: 'patch'; admissionId: number; external_reference: string }
  | { kind: 'create'; external_reference: string }
  | { kind: 'skip'; reason: string; external_reference?: string };

export interface AdmissionReimportPlanRow {
  row_number: number;
  external_reference?: string;
  action: AdmissionReimportRowAction;
  payload: Record<string, unknown>;
  warnings: AdmissionReimportRowWarning[];
}

export interface AdmissionReimportDryRunResult {
  total_rows: number;
  matched: number;
  patched_planned: number;
  created_planned: number;
  skipped: number;
  missing_external_reference: number;
  invalid_sibling_lines_json: number;
  potential_duplicates: number;
  warnings: AdmissionReimportRowWarning[];
  rows: AdmissionReimportPlanRow[];
}

export interface AdmissionReimportExecuteResult {
  sample_size?: number;
  total_rows: number;
  patched: number;
  created: number;
  skipped: number;
  failed: number;
  duplicates_detected: number;
  errors: Array<{ row_number: number; external_reference?: string; message: string }>;
}

export interface ParsedSiblingLinesJson {
  lines?: SiblingLine[];
  error?: string;
}
