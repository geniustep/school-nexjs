// Student resources — mirrors API_REPORT.md §3 (admin/students, student-view).

import type { Ref } from './api';

export type StudentStatus =
  | 'draft'
  | 'active'
  | 'graduated'
  | 'suspended'
  | 'expelled'
  | 'transferred';

export type Gender = 'male' | 'female';

export interface ParentLink {
  id: number;
  name: string;
  phone: string | null;
}

export interface Student {
  id: number;
  full_name: string;
  code: string | null;
  level: Ref | null;
  class: Ref | null;
  parents: ParentLink[];
  status: StudentStatus;
  gender: Gender | null;
  date_of_birth: string | null;
  admission_date: string | null;
  email: string | null;
  phone: string | null;
}

// Compact child shape used by parent endpoints.
export interface ChildSummary {
  id: number;
  full_name: string;
  code?: string | null;
  level?: Ref | null;
  class: Ref | null;
  status?: StudentStatus;
}
