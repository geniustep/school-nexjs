// Level / Class / Subject resources — mirrors API_REPORT.md §3.

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
