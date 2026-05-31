// Teacher homework resources — mirrors live API v1 teacher/homeworks payloads.

import type { Ref } from './api';
import type { AttachmentMeta } from './attachment';

export type HomeworkState = 'draft' | 'published' | 'closed';

export interface HomeworkSummary {
  id: number;
  name: string;
  description_short?: string | null;
  class: Ref;
  subject?: Ref | null;
  teacher?: Ref | null;
  publish_date?: string | null;
  deadline?: string | null;
  state: HomeworkState | string;
  visible_to_parent?: boolean;
  visible_to_student?: boolean;
  require_submission?: boolean;
  attachment_count?: number;
  is_read?: boolean;
  submitted?: boolean;
  submission_state?: string | null;
  is_late?: boolean;
}

export interface MySubmission {
  id: number;
  state: string;
  submission_date?: string | null;
  comment?: string | null;
  teacher_feedback?: string | null;
  attachments?: AttachmentMeta[];
}

export interface HomeworkDetail extends HomeworkSummary {
  description?: string | null;
  attachments?: AttachmentMeta[];
  submissions?: HomeworkSubmission[];
  my_submission?: MySubmission | null;
}

/** Admin list row — GET /admin/homeworks */
export interface AdminHomeworkSummary {
  id: number;
  name: string;
  class: Ref;
  subject?: Ref | null;
  teacher?: Ref | null;
  state: HomeworkState | string;
  publish_date?: string | null;
  deadline?: string | null;
  submission_count?: number;
  require_submission?: boolean;
}

export interface HomeworkSubmission {
  id: number;
  submission_id?: number;
  state: string;
  comment?: string | null;
  submission_date?: string | null;
  attachments?: AttachmentMeta[];
  message?: string | null;
  student: Ref;
  teacher_feedback?: string | null;
}
