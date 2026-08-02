// Level / Class / Subject resources — mirrors API_REPORT.md §3.
//
// Odoo 18.0.1.0.10+: a class is an operational hub (students, attendance,
// homework, timetable, exams, …). Official academic links use
// school.class.assignment and school.student.enrollment in Odoo; API v1 still
// exposes class via current_class_id / class refs on existing endpoints.
// TODO: when assignment/enrollment list APIs ship, add paths in endpoints.ts
// and class detail UI for subject–teacher assignments and enrollment history.

import type { LevelLinkedItems, SchoolLevelUsage } from './academic-levels';
import type { Ref } from './api';

export interface TrackRef extends Ref {
  code?: string | null;
}

export type SubjectSource = 'level' | 'track' | 'class';

export interface Subject {
  id: number;
  name: string;
  code?: string | null;
  level_id?: number | null;
  level_ids?: number[];
  track_id?: number | null;
  ref_subject_id?: number | null;
  source?: SubjectSource;
  required?: boolean;
  optional?: boolean;
  sequence?: number;
  weekly_hours?: number | null;
  legacy_coefficient?: number | null;
  assessment_coefficient?: number | null;
  exam_coefficient?: number | null;
  assignments_count?: number;
  active?: boolean;
}

export type ClassSubjectsSource = 'inherited' | 'direct' | 'mixed' | 'none';

export interface LevelCycle {
  id: number;
  code: string;
  name: string;
  sequence?: number;
}

export interface Level {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
  academic_code?: string | null;
  moroccan_display_alias?: string | null;
  sequence?: number;
  ref_level_id?: number | null;
  supports_tracks?: boolean;
  cycle?: LevelCycle | null;
  active?: boolean;
  classes_count?: number;
  subjects_count?: number;
  tracks_count?: number;
  subjects?: Subject[];
  can_delete?: boolean;
  can_deactivate?: boolean;
  usage?: SchoolLevelUsage;
  linked_items?: LevelLinkedItems;
}

export interface SchoolClassUsage {
  students: number;
  enrollments: number;
  assignments: number;
  timetable_slots: number;
  exams: number;
  homeworks?: number;
  attendance_records?: number;
}

export type DeleteClassAction = 'deleted' | 'deactivated';

export interface ClassRemovalResponse {
  action: DeleteClassAction;
  id: number;
  reason?: string;
}

export interface SchoolClass {
  id: number;
  name: string;
  code: string | null;
  display_name?: string | null;
  display_alias?: string | null;
  section_name?: string | null;
  academic_code?: string | null;
  recommended_display_code?: string | null;
  code_status?: 'ok' | 'legacy' | string | null;
  level: (Ref & {
    code?: string | null;
    display_name?: string | null;
    display_alias?: string | null;
    academic_code?: string | null;
    moroccan_display_alias?: string | null;
  }) | null;
  track?: TrackRef | null;
  track_id?: number | null;
  academic_year: string | null;
  /** Present on list/detail payloads when the year id is known for uniqueness scope. */
  academic_year_id?: number | null;
  student_count: number;
  capacity: number | null;
  teachers: Ref[];
  subjects: Subject[];
  subjects_count?: number;
  effective_subjects_count?: number;
  inherited_level_subjects_count?: number;
  inherited_track_subjects_count?: number;
  direct_class_subjects_count?: number;
  excluded_subjects_count?: number;
  subjects_source?: ClassSubjectsSource;
  missing_teacher_assignments_count?: number;
  status: string;
  can_delete?: boolean;
  can_deactivate?: boolean;
  usage?: SchoolClassUsage;
}
