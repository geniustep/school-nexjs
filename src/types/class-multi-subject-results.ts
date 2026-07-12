/**
 * Live contract: GET /admin/assessment/classes/{class_id}/results
 * Query: academic_year_id, term_id
 * Frontend displays backend values only — no cross-subject averages or ranking.
 */

export type ClassMultiSubjectResultStatus =
  | 'available'
  | 'complete'
  | 'partial'
  | 'not_computable'
  | 'not_available'
  | string;

export type ClassMultiSubjectWarningCode =
  | 'duplicate_subject_gradebooks'
  | 'configured_subject_without_gradebook'
  | 'student_not_in_gradebook_roster'
  | string;

export interface ClassMultiSubjectResultsContext {
  school_id: number;
  academic_year_id: number;
  term_id: number;
  class_id: number;
  class_name: string;
  level_id?: number | null;
  level_code?: string | null;
}

export interface ClassMultiSubjectColumn {
  gradebook_id: number;
  subject_id: number;
  subject_code?: string | null;
  subject_name: string;
  gradebook_state: string;
  scheme_id?: number | null;
  structure_mode?: string | null;
}

export interface ClassMultiSubjectRosterRow {
  student_id: number;
  enrollment_id?: number | null;
  roster_sequence: number;
  student_name: string;
  student_code?: string | null;
}

export interface ClassMultiSubjectCellResult {
  gradebook_id: number;
  student_line_id?: number | null;
  status: ClassMultiSubjectResultStatus;
  score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  completed_cells?: number | null;
  expected_cells?: number | null;
  missing_cells?: number | null;
  blocking_cells?: number | null;
  available?: boolean | null;
  reason?: string | null;
  gradebook_state?: string | null;
}

export interface ClassMultiSubjectMatrixRow {
  student_id: number;
  enrollment_id?: number | null;
  roster_sequence?: number | null;
  subject_results: ClassMultiSubjectCellResult[];
}

export interface ClassMultiSubjectCoverage {
  gradebooks_count: number;
  subjects_count: number;
  roster_count: number;
  students_with_all_subjects: number;
  students_with_missing_subjects: number;
  gradebooks_by_state: Record<string, number>;
  warnings_count: number;
}

export interface ClassMultiSubjectWarning {
  code: ClassMultiSubjectWarningCode;
  message: string;
  subject_id?: number | null;
  subject_code?: string | null;
  gradebook_id?: number | null;
  student_id?: number | null;
  [key: string]: unknown;
}

export interface ClassMultiSubjectResults {
  context: ClassMultiSubjectResultsContext;
  subjects: ClassMultiSubjectColumn[];
  roster: ClassMultiSubjectRosterRow[];
  matrix: ClassMultiSubjectMatrixRow[];
  coverage: ClassMultiSubjectCoverage;
  warnings: ClassMultiSubjectWarning[];
}
