// Student resources — mirrors API_REPORT.md §3 (admin/students, student-view).

import type { Ref } from './api';
import type { UserAccountInfo } from './account';

export type StudentStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'graduated'
  | 'suspended'
  | 'expelled'
  | 'transferred'
  | 'withdrawn'
  | string;

export type Gender = 'male' | 'female';

export interface ParentLink {
  id: number;
  name: string;
  phone: string | null;
}

/** Name fields returned by Odoo (structured + legacy). All optional at runtime. */
export interface StudentNameFields {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
}

export interface Student extends StudentNameFields {
  id: number;
  code: string | null;
  school_number?: string | null;
  massar_code?: string | null;
  matricule?: string | null;
  level: Ref | null;
  class: Ref | null;
  /** May be omitted when no guardian is linked (data-quality in Odoo). */
  parents?: ParentLink[];
  status: StudentStatus;
  gender: Gender | null;
  date_of_birth: string | null;
  admission_date: string | null;
  email: string | null;
  phone: string | null;
  login?: string | null;
  user_id?: number | null;
  account?: UserAccountInfo | null;
}

// Compact child shape used by parent endpoints (GET /parent/children).
export interface ChildSummary extends StudentNameFields {
  id: number;
  code?: string | null;
  level?: Ref | null;
  class: Ref | null;
  status?: StudentStatus;
}
