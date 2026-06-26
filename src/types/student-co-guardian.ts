// Student 360 — co-guardian students (read-only).
// GET /admin/students/{student_id}/co-guardian-students
//
// Product rule: sharing a guardian does NOT confirm a sibling relationship.
// These are "students linked to the same guardian" candidates, surfaced to help
// admins discover possible relationships — never labelled as confirmed siblings
// unless `is_confirmed_sibling` is true.

/** A student linked to one of the focus student's guardians. */
export interface CoGuardianOtherStudent {
  student_id: number;
  display_name: string | null;
  level_name?: string | null;
  class_name?: string | null;
  status?: string | null;
  relationship_to_guardian?: string | null;
}

/** A guardian shared between the focus student and other students. */
export interface CoGuardianGuardian {
  guardian_id: number;
  guardian_name: string | null;
  relationship?: string | null;
  is_primary?: boolean;
  other_students_count?: number;
  other_students: CoGuardianOtherStudent[];
}

/** A candidate: another student that shares at least one guardian with the focus student. */
export interface CoGuardianCandidate {
  student_id: number;
  display_name: string | null;
  level_name?: string | null;
  class_name?: string | null;
  status?: string | null;
  shared_guardian_ids: number[];
  /** Names resolved client-side from the guardians[] list (best-effort). */
  shared_guardian_names: string[];
  evidence: string[];
  is_confirmed_sibling: boolean;
}

export interface CoGuardianStudentsSummary {
  guardian_count: number;
  candidate_count: number;
}

export interface CoGuardianStudentsData {
  student_id: number | null;
  school_id: number | null;
  guardians: CoGuardianGuardian[];
  candidates: CoGuardianCandidate[];
  summary: CoGuardianStudentsSummary;
}
