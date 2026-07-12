import type { Ref } from './api';

export type DiagnosticAssessmentState = 'draft' | 'confirmed';

export type DiagnosticParticipationState =
  | 'not_entered'
  | 'scored'
  | 'absent'
  | 'absent_justified'
  | 'incomplete';

export interface DiagnosticScoreScaleItem {
  score: number;
  phrase: string;
}

export interface DiagnosticCompletion {
  students_total: number;
  scored_count: number;
  absent_count: number;
  incomplete_count: number;
  not_entered_count: number;
  resolved_count: number;
  completion_percent: number;
  average_score: number | null;
  score_distribution: Record<string, number>;
}

export interface DiagnosticAllowedActions {
  build_roster?: boolean;
  sync_roster?: boolean;
  edit_lines?: boolean;
  confirm?: boolean;
  reset_to_draft?: boolean;
  [key: string]: boolean | undefined;
}

export interface DiagnosticStudentRef extends Ref {
  code?: string | null;
  massar_code?: string | null;
}

export interface DiagnosticAssessmentLine {
  id: number;
  roster_sequence: number;
  student: DiagnosticStudentRef;
  enrollment_id?: number | null;
  participation_state: DiagnosticParticipationState | string;
  score: number | null;
  phrase: string | null;
  teacher_note: string | null;
  is_resolved?: boolean;
}

export interface DiagnosticAssessmentSummary {
  id: number;
  display_name?: string | null;
  name?: string | null;
  assessment_date?: string | null;
  state: DiagnosticAssessmentState | string;
  school?: Ref | null;
  academic_year?: Ref | null;
  class?: Ref | null;
  level?: Ref | null;
  subject?: Ref | null;
  teacher?: Ref | null;
  completion: DiagnosticCompletion;
  allowed_actions: DiagnosticAllowedActions;
}

export interface DiagnosticAssessmentDetail extends DiagnosticAssessmentSummary {
  notes?: string | null;
  score_scale: DiagnosticScoreScaleItem[];
  lines: DiagnosticAssessmentLine[];
  confirmed_by?: Ref | null;
  confirmed_date?: string | null;
}

export interface CreateDiagnosticAssessmentPayload {
  academic_year_id: number;
  class_id: number;
  subject_id: number;
  teacher_id?: number;
  name?: string;
  assessment_date?: string;
  notes?: string;
}

export interface DiagnosticLinePatch {
  id?: number;
  line_id?: number;
  student_id?: number;
  score?: number | null;
  participation_state?: DiagnosticParticipationState | string;
  teacher_note?: string | null;
  roster_sequence?: number;
}

export interface BatchUpdateDiagnosticLinesPayload {
  lines: DiagnosticLinePatch[];
}

export interface BatchUpdateDiagnosticLinesResponse {
  updated_count: number;
  lines: DiagnosticAssessmentLine[];
  completion: DiagnosticCompletion;
}

export interface DiagnosticRosterActionResponse {
  assessment_id: number;
  added_count: number;
  students_total_before: number;
  students_total_after: number;
  completion: DiagnosticCompletion;
}

export interface DiagnosticAssessmentSummaryPayload {
  assessment_id: number;
  state: DiagnosticAssessmentState | string;
  completion: DiagnosticCompletion;
}

export interface DiagnosticPrintLine {
  roster_sequence: number;
  student_name: string;
  student_code?: string | null;
  participation_state: DiagnosticParticipationState | string;
  score: number | null;
  phrase: string | null;
  teacher_note: string | null;
}

export interface DiagnosticPrintPayload {
  assessment: {
    id: number;
    title: string;
    assessment_date?: string | null;
    state: DiagnosticAssessmentState | string;
    school?: Ref | null;
    academic_year?: Ref | null;
    class?: Ref | null;
    level?: Ref | null;
    subject?: Ref | null;
    teacher?: Ref | null;
  };
  score_scale: DiagnosticScoreScaleItem[];
  summary: DiagnosticCompletion;
  lines: DiagnosticPrintLine[];
}
