// Teacher exams and results — mirrors live API v1 teacher/exams payloads.

import type { Ref } from './api';
import type { AttachmentMeta } from './attachment';

export type ExamState = 'draft' | 'published' | 'cancelled' | 'done' | 'archived';
export type ExamResultState = 'draft' | 'published' | 'archived';

export interface ExamSubject extends Ref {
  color?: string | null;
}

export interface ExamSummary {
  id: number;
  name: string;
  exam_type?: string | null;
  exam_type_label?: string | null;
  exam_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  state: ExamState | string;
  coefficient?: number | null;
  class: Ref;
  subject?: ExamSubject | null;
  teacher?: Ref | null;
  term?: Ref | null;
  attachment_count?: number;
  is_upcoming?: boolean;
  days_left?: number | null;
}

export interface ExamDetail extends ExamSummary {
  instructions?: string | null;
  visible_to_parent?: boolean;
  visible_to_student?: boolean;
  attachments?: AttachmentMeta[];
}

export interface ExamResultsSummary {
  average?: number | null;
  published_results_count?: number;
  best_subject?: string | null;
  needs_support_subjects?: string[];
}

export interface ExamResultsListResponse {
  results: ExamResult[];
  summary?: ExamResultsSummary;
}

export interface ExamResult {
  id: number;
  exam: {
    id: number;
    name: string;
    exam_date?: string | null;
    exam_type?: string | null;
  };
  student: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    massar_code?: string | null;
  };
  class: Ref;
  subject?: ExamSubject | null;
  teacher?: Ref | null;
  score: number;
  max_score: number;
  percentage: number;
  coefficient?: number | null;
  grade_label?: string | null;
  rank_in_class?: number | null;
  teacher_comment?: string | null;
  state: ExamResultState | string;
}
