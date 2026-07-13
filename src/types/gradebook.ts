import type { Ref } from './api';

export type GradebookState =
  | 'draft'
  | 'open'
  | 'submitted'
  | 'validated'
  | 'published'
  | 'locked';

export type ParticipationState =
  | 'not_entered'
  | 'taken'
  | 'absent'
  | 'absent_justified'
  | 'exempted'
  | 'not_graded';

export type GradebookStructureMode = 'simple' | 'composite';

export type GradebookLifecycleAction =
  | 'build_roster'
  | 'sync_roster'
  | 'open'
  | 'submit'
  | 'validate'
  | 'publish'
  | 'lock';

export interface GradebookAllowedActions {
  create?: boolean;
  view?: boolean;
  edit_entries?: boolean;
  build_roster?: boolean;
  sync_roster?: boolean;
  open?: boolean;
  submit?: boolean;
  validate?: boolean;
  publish?: boolean;
  lock?: boolean;
  [key: string]: boolean | undefined;
}

export interface GradebookSummary {
  id: number;
  subject?: Ref | null;
  class?: Ref | null;
  academic_year?: Ref | null;
  term?: Ref | null;
  teacher?: Ref | null;
  state: GradebookState | string;
  completion_percent?: number | null;
  students_count?: number | null;
  last_operational_hint?: string | null;
  scheme?: Ref | null;
}

export interface GradebookContext {
  subject?: Ref | null;
  class?: Ref | null;
  academic_year?: Ref | null;
  term?: Ref | null;
  teacher?: Ref | null;
  scheme?: Ref | null;
  state: GradebookState | string;
}

export interface AssessmentSlot {
  slot_id: number;
  label: string;
  sequence?: number;
}

export interface SubjectComponent {
  component_id: number;
  label: string;
  code?: string | null;
}

export interface ScorableCell {
  cell_id: number;
  slot_id: number;
  component_id?: number | null;
  slot_label?: string | null;
  component_label?: string | null;
  effective_max_score: number;
}

export interface GradebookStructure {
  mode: GradebookStructureMode;
  slots: AssessmentSlot[];
  components?: SubjectComponent[];
  cells: ScorableCell[];
}

export interface GradebookRosterRow {
  gradebook_student_id: number;
  student_id: number;
  display_name: string;
  massar_code?: string | null;
  roster_sequence: number;
}

export interface GradebookMatrixEntry {
  student_line_id: number;
  cell_id: number;
  score: number | null;
  score_is_set: boolean;
  participation_state: ParticipationState;
  comment?: string | null;
  editable: boolean;
}

export interface CompletionSummary {
  completion_percent: number;
  unresolved_entries: number;
  students_total: number;
  cells_total: number;
}

export interface GradebookLifecycleStep {
  state: GradebookState | string;
  label?: string | null;
  reached?: boolean;
  current?: boolean;
}

export interface GradebookDetail {
  id: number;
  context: GradebookContext;
  structure: GradebookStructure;
  roster: GradebookRosterRow[];
  matrix: GradebookMatrixEntry[];
  completion: CompletionSummary;
  lifecycle?: GradebookLifecycleStep[];
  allowed_actions: GradebookAllowedActions | string[];
}

export interface CreateGradebookPayload {
  academic_year_id: number;
  term_id: number;
  class_id: number;
  subject_id: number;
  scheme_id: number;
  teacher_id?: number;
  teaching_offering_id?: number | null;
}

export interface BatchEntryUpdateItem {
  student_line_id: number;
  cell_id: number;
  score?: number | null;
  score_is_set?: boolean;
  participation_state?: ParticipationState;
  comment?: string | null;
}

export interface BatchEntryUpdatePayload {
  entries: BatchEntryUpdateItem[];
}

export interface BatchEntryUpdateResponse {
  completion: CompletionSummary;
  entries?: GradebookMatrixEntry[];
}

export interface GradebookSchemeOption extends Ref {
  subject_id?: number;
  class_id?: number;
}

export interface GradebookTermOption extends Ref {
  academic_year_id?: number;
}

/** Aggregation / slot status values returned by Results API. */
export type GradebookResultStatus =
  | 'available'
  | 'complete'
  | 'partial'
  | 'not_computable'
  | string;

/** Cell-level result row from GET …/gradebooks/{id}/results. */
export interface GradebookCellResult {
  cell_id: number;
  slot_id: number;
  component_id?: number | null;
  score: number | null;
  score_is_set: boolean;
  participation_state: ParticipationState | string;
  max_score: number;
  normalized_score: number | null;
  included_in_aggregation: boolean;
}

/** Slot-level aggregate from Results API. */
export interface GradebookSlotResult {
  slot_id: number;
  weight?: number | null;
  status: GradebookResultStatus;
  score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  completed_cells: number;
  expected_cells: number;
  included_cells: number;
  missing_cells: number;
  blocking_cells: number;
  reason?: string | null;
}

/** Student-level aggregate from Results API. */
export interface GradebookStudentAggregate {
  status: GradebookResultStatus;
  score: number | null;
  max_score: number | null;
  normalized_score: number | null;
  completed_cells: number;
  expected_cells: number;
  included_cells: number;
  missing_cells: number;
  blocking_cells: number;
  reason?: string | null;
}

export interface GradebookStudentResult {
  student_line_id: number;
  student_id: number;
  cells: GradebookCellResult[];
  slots: GradebookSlotResult[];
  aggregate: GradebookStudentAggregate;
}

/**
 * Payload of admin/teacher Results endpoints.
 * No gradebook-level summary object is returned by the live contract.
 */
export interface GradebookResults {
  gradebook_id: number;
  state: GradebookState | string;
  mode: GradebookStructureMode | string;
  scheme_id?: number | null;
  scheme_version?: number | null;
  students: GradebookStudentResult[];
}
