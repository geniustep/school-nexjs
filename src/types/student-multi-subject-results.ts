/**
 * Live contract: GET /admin/assessment/students/{student_id}/results
 * Query: academic_year_id, term_id
 * Frontend displays backend values only — no overall average or ranking.
 */

export type StudentMultiSubjectResultStatus =
  | 'available'
  | 'complete'
  | 'partial'
  | 'not_computable'
  | 'not_available'
  | string;

export type StudentMultiSubjectWarningCode =
  | 'duplicate_subject_gradebooks'
  | 'configured_subject_without_gradebook'
  | 'student_not_in_gradebook_roster'
  | 'student_not_enrolled_for_academic_year'
  | string;

export interface StudentMultiSubjectResultsContext {
  school_id: number;
  academic_year_id: number;
  term_id: number;
  class_id?: number | null;
  class_name?: string | null;
  level_id?: number | null;
  level_code?: string | null;
  academic_year_name?: string | null;
  term_name?: string | null;
}

export interface StudentMultiSubjectStudent {
  student_id: number;
  student_name?: string | null;
  student_code?: string | null;
}

export interface StudentMultiSubjectEnrollment {
  enrollment_id?: number | null;
  roster_sequence?: number | null;
  state?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  level_id?: number | null;
  level_code?: string | null;
}

export interface StudentMultiSubjectColumn {
  gradebook_id?: number | null;
  subject_id: number;
  subject_code?: string | null;
  subject_name: string;
  gradebook_state?: string | null;
  scheme_id?: number | null;
  structure_mode?: string | null;
}

export interface StudentMultiSubjectResultRow {
  gradebook_id?: number | null;
  subject_id?: number | null;
  subject_code?: string | null;
  subject_name?: string | null;
  gradebook_state?: string | null;
  status: StudentMultiSubjectResultStatus;
  score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  completed_cells?: number | null;
  expected_cells?: number | null;
  missing_cells?: number | null;
  blocking_cells?: number | null;
  available?: boolean | null;
  reason?: string | null;
}

export interface StudentMultiSubjectCoverage {
  subjects_count: number;
  available_subjects: number;
  complete_subjects: number;
  partial_subjects: number;
  not_computable_subjects: number;
  not_available_subjects: number;
  missing_subjects: number;
}

export interface StudentMultiSubjectWarning {
  code: StudentMultiSubjectWarningCode;
  message: string;
  subject_id?: number | null;
  subject_code?: string | null;
  gradebook_id?: number | null;
  student_id?: number | null;
  [key: string]: unknown;
}

export interface StudentMultiSubjectResults {
  /** Aggregate payload status from backend (e.g. available / not_available). */
  status?: StudentMultiSubjectResultStatus | null;
  reason?: string | null;
  context: StudentMultiSubjectResultsContext;
  student: StudentMultiSubjectStudent;
  enrollment: StudentMultiSubjectEnrollment | null;
  subjects: StudentMultiSubjectColumn[];
  results: StudentMultiSubjectResultRow[];
  coverage: StudentMultiSubjectCoverage;
  warnings: StudentMultiSubjectWarning[];
}
