export type ClassReadinessStatus = 'ready' | 'partial' | 'not_ready';

export interface ClassGenderSummary {
  female: number;
  male: number;
  unspecified: number;
  total: number;
}

export interface ClassReadinessItem {
  ready: boolean;
}

export interface TeachingAssignmentReadinessItem extends ClassReadinessItem {
  missing_count: number;
}

export interface ClassReadiness {
  completed: number;
  total: number;
  status: ClassReadinessStatus;
  items: {
    capacity: ClassReadinessItem;
    subjects: ClassReadinessItem;
    teaching_assignments: TeachingAssignmentReadinessItem;
    timetable: ClassReadinessItem;
  };
}

export interface DistributionContextLevel {
  id: number;
  code?: string | null;
  name: string;
  display_code?: string | null;
  display_alias?: string | null;
  display_label?: string | null;
  academic_code?: string | null;
  supports_tracks?: boolean;
  cycle?: { code?: string | null; name?: string | null } | null;
  category?: string | null;
}

export interface DistributionClassSummary {
  id: number;
  name: string;
  code?: string | null;
  capacity: number | null;
  assigned_count: number;
  gender_summary: ClassGenderSummary;
  readiness: ClassReadiness;
}

export interface ClassDistributionSummary {
  classes_count: number;
  assigned_count: number;
  unassigned_count: number;
  total_registered: number;
  total_capacity: number;
  available_seats: number;
}

export type DistributionStudentGender = 'female' | 'male' | null;

export interface UnassignedDistributionStudent {
  id: number;
  code?: string | null;
  name: string;
  gender: DistributionStudentGender;
}

export interface UnassignedDistributionPage {
  page: number;
  page_size: number;
  total: number;
  items: UnassignedDistributionStudent[];
}

export interface ClassDistributionData {
  context: {
    school_id: number;
    academic_year_id: number;
    level: DistributionContextLevel;
  };
  summary: ClassDistributionSummary;
  classes: DistributionClassSummary[];
  unassigned_students: UnassignedDistributionPage;
}

/** V1 initial assignment contract — kept for backward compatibility. */
export interface ClassDistributionAssignment {
  student_id: number;
  class_id: number;
}

export interface ClassDistributionAssignRequest {
  level_id: number;
  mode: 'preview' | 'apply';
  assignments: ClassDistributionAssignment[];
}

export interface ClassDistributionPreviewClass {
  id: number;
  before: { assigned_count: number; capacity: number | null };
  after: { assigned_count: number; capacity: number | null };
}

export interface ClassDistributionPreviewResponse {
  mode: 'preview';
  valid: boolean;
  assignments_count: number;
  assignments: Array<ClassDistributionAssignment & { status: 'ready' | string }>;
  classes: ClassDistributionPreviewClass[];
  errors: unknown[];
}

export interface ClassDistributionApplyResponse {
  mode: 'apply';
  applied: boolean;
  assignments_count: number;
  assignments: Array<
    ClassDistributionAssignment & { status: 'assigned' | string; enrollment_id?: number }
  >;
  affected_classes: DistributionClassSummary[];
  remaining_unassigned_count: number;
}

/** V2 workspace read contract. */
export interface DistributionWorkspaceStudent {
  id: number;
  enrollment_id: number;
  class_id: number;
  code?: string | null;
  name: string;
  gender: DistributionStudentGender;
}

export interface DistributionStudentsPreview {
  total: number;
  limit: number;
  items: DistributionWorkspaceStudent[];
}

export interface DistributionWorkspaceClass extends DistributionClassSummary {
  students_preview: DistributionStudentsPreview;
}

export interface ClassDistributionWorkspaceData {
  context: ClassDistributionData['context'];
  summary: ClassDistributionSummary;
  classes: DistributionWorkspaceClass[];
  unassigned_students: UnassignedDistributionPage;
}

/** Unified client selection item. Unassigned rows do not expose enrollment_id in the V2 read contract. */
export interface DistributionSelectionItem {
  studentId: number;
  enrollmentId: number | null;
  sourceClassId: number | null;
  name: string;
  code?: string | null;
  gender: DistributionStudentGender;
}

export interface ClassDistributionMove {
  student_id: number;
  from_class_id: number | null;
  to_class_id: number | null;
}

export interface ClassDistributionMoveRequest {
  academic_year_id?: number;
  level_id: number;
  mode: 'preview' | 'apply';
  moves: ClassDistributionMove[];
}

export interface ClassDistributionMoveResult extends ClassDistributionMove {
  status: string;
  enrollment_id?: number;
  error_code?: string;
}

export interface ClassDistributionMovePreviewClass {
  id: number;
  before: { assigned_count: number; capacity: number | null };
  after: { assigned_count: number; capacity: number | null };
  delta: number;
}

export interface ClassDistributionMovePreviewResponse {
  mode: 'preview';
  valid: boolean;
  moves_count: number;
  moves: ClassDistributionMoveResult[];
  classes: ClassDistributionMovePreviewClass[];
  errors: unknown[];
}

export interface ClassDistributionMoveApplyResponse {
  mode: 'apply';
  applied: boolean;
  moves_count: number;
  moves: ClassDistributionMoveResult[];
  affected_classes: DistributionClassSummary[];
  remaining_unassigned_count: number;
}
