import type { Ref, SchoolRef } from '@/types/api';

export const ALL_SCHOOLS_ENDPOINTS = {
  dashboard: '/admin/dashboard/all-schools',
  students: '/admin/students/all-schools',
  classes: '/admin/classes/all-schools',
  parents: '/admin/parents/all-schools',
} as const;

export interface AllSchoolsStudent {
  id: number;
  display_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  massar_code?: string | null;
  status?: string | null;
  school: SchoolRef;
  class?: Ref | null;
  level?: Ref | null;
}

export interface AllSchoolsClass {
  id: number;
  name: string;
  display_name?: string | null;
  level?: Ref | null;
  academic_year?: string | null;
  student_count?: number | null;
  assigned_count?: number | null;
  status?: string | null;
  school: SchoolRef;
}

export interface AllSchoolsParent {
  id: number;
  name?: string | null;
  display_name?: string | null;
  mobile?: string | null;
  phone?: string | null;
  linked_students_count?: number | null;
  children?: unknown[] | null;
  status?: string | null;
  school: SchoolRef;
}

export interface AllSchoolsAttendanceSummary {
  present?: number;
  absent?: number;
  late?: number;
  left_early?: number;
  total_recorded?: number;
}

export interface AllSchoolsDashboardSummary {
  total_students?: number;
  total_teachers?: number;
  total_parents?: number;
  total_classes?: number;
  attendance_today?: AllSchoolsAttendanceSummary;
  upcoming_exams_count?: number;
  exams_this_week?: number;
  exams_today?: number;
  draft_exam_results_count?: number;
  published_exam_results_count?: number;
  exams_missing_results?: number;
}

export interface AllSchoolsDashboardSchool {
  school: SchoolRef;
  academic_year?: Ref | string | null;
  summary: AllSchoolsDashboardSummary;
}

export interface AllSchoolsDashboard {
  summary: AllSchoolsDashboardSummary;
  schools: AllSchoolsDashboardSchool[];
}
