// Level / Class / Subject resources — mirrors API_REPORT.md §3.
//
// Odoo 18.0.1.0.10+: a class is an operational hub (students, attendance,
// homework, timetable, exams, …). Official academic links use
// school.class.assignment and school.student.enrollment in Odoo; API v1 still
// exposes class via current_class_id / class refs on existing endpoints.
// TODO: when assignment/enrollment list APIs ship, add paths in endpoints.ts
// and class detail UI for subject–teacher assignments and enrollment history.

import type { SchoolLevelUsage } from './academic-levels';
import type { Ref } from './api';

export interface TrackRef extends Ref {
  code?: string | null;
}

export interface Subject {
  id: number;
  name: string;
  code?: string | null;
  level_id?: number | null;
  track_id?: number | null;
  source?: 'level' | 'track';
  required?: boolean;
  optional?: boolean;
  sequence?: number;
  weekly_hours?: number | null;
  assignments_count?: number;
}

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
  sequence?: number;
  ref_level_id?: number | null;
  supports_tracks?: boolean;
  cycle?: LevelCycle | null;
  active?: boolean;
  classes_count?: number;
  subjects_count?: number;
  subjects?: Subject[];
  can_delete?: boolean;
  can_deactivate?: boolean;
  usage?: SchoolLevelUsage;
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
  level: Ref | null;
  track?: TrackRef | null;
  track_id?: number | null;
  academic_year: string | null;
  student_count: number;
  capacity: number | null;
  teachers: Ref[];
  subjects: Subject[];
  status: string;
  can_delete?: boolean;
  can_deactivate?: boolean;
  usage?: SchoolClassUsage;
}
