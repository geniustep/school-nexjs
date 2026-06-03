// Level / Class / Subject resources — mirrors API_REPORT.md §3.
//
// Odoo 18.0.1.0.10+: a class is an operational hub (students, attendance,
// homework, timetable, exams, …). Official academic links use
// school.class.assignment and school.student.enrollment in Odoo; API v1 still
// exposes class via current_class_id / class refs on existing endpoints.
// TODO: when assignment/enrollment list APIs ship, add paths in endpoints.ts
// and class detail UI for subject–teacher assignments and enrollment history.

import type { Ref } from './api';

export interface Subject {
  id: number;
  name: string;
  code?: string | null;
}

export interface Level {
  id: number;
  name: string;
  code?: string | null;
  subjects?: Subject[];
}

export interface SchoolClass {
  id: number;
  name: string;
  code: string | null;
  level: Ref | null;
  academic_year: string | null;
  student_count: number;
  capacity: number | null;
  teachers: Ref[];
  subjects: Subject[];
  status: string;
}
