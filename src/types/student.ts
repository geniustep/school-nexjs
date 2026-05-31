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
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  name?: string | null;
  code: string | null;
  massar_code?: string | null;
  matricule?: string | null;
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
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  name?: string | null;
  code?: string | null;
  level?: Ref | null;
  class: Ref | null;
  status?: StudentStatus;
}
