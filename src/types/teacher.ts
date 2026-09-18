// Teacher options + extended profile — School API v1 admin/teachers.

import type { Ref, SchoolRef } from './api';
import type { UserAccountInfo } from './account';

export type TeacherOption = {
  value: string;
  label: string;
};

export type TeacherOptionsSchool = SchoolRef & {
  code?: string | null;
};

export type TeacherOptionsConstraint = {
  min?: number;
  max?: number;
  unit?: string;
};

export type TeacherOptionsDefaults = {
  teacherType?: string;
  status?: string;
  active?: boolean;
  preferCompactSchedule?: boolean;
};

export type TeacherOptionsConstraints = {
  weeklyHours?: TeacherOptionsConstraint;
  maxContinuousMinutes?: TeacherOptionsConstraint;
  specialization?: TeacherOptionsConstraint;
};

/** Normalized teacher form options from GET /admin/teachers/options. */
export type TeacherOptions = {
  teacherTypes: TeacherOption[];
  qualifications: TeacherOption[];
  contractTypes: TeacherOption[];
  statuses: TeacherOption[];
  genders: TeacherOption[];
  schools: TeacherOptionsSchool[];
  defaults: TeacherOptionsDefaults;
  constraints: TeacherOptionsConstraints;
};

/** Raw API payload (snake_case) — internal to normalizer. */
export type TeacherOptionsPayload = {
  teacher_types?: TeacherOption[];
  qualifications?: TeacherOption[];
  contract_types?: TeacherOption[];
  statuses?: TeacherOption[];
  genders?: TeacherOption[];
  schools?: TeacherOptionsSchool[];
  defaults?: {
    teacher_type?: string;
    status?: string;
    active?: boolean;
    prefer_compact_schedule?: boolean;
  };
  constraints?: {
    weekly_hours?: TeacherOptionsConstraint;
    max_continuous_minutes?: TeacherOptionsConstraint;
    specialization?: TeacherOptionsConstraint;
  };
};

export type TeacherPersonIdentity = {
  display_name?: string | null;
  partner_id?: number | null;
  partner_name?: string | null;
  name_ar?: string | null;
  name_fr?: string | null;
  source?: string | null;
};

export type TeacherGuardianChild = {
  id: number;
  name: string | null;
  code?: string | null;
  school?: { id: number; name: string } | null;
  class?: { id: number; name: string } | null;
};

export type TeacherGuardianContext = {
  is_guardian: boolean;
  guardian_id: number | null;
  children_count: number;
  children: TeacherGuardianChild[];
};

export interface TeacherAssignmentRef {
  id: number;
  class: { id: number; name: string };
  subject: { id: number; name: string; code?: string | null };
  weekly_hours?: number;
  role?: string;
  active?: boolean;
}

export interface Teacher {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  mobile?: string | null;
  email: string | null;
  identity?: TeacherPersonIdentity | null;
  guardian_context?: TeacherGuardianContext | null;
  gender?: string | null;
  date_of_birth?: string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  employment_end_date?: string | null;
  employment_end_reason?: string | null;
  archive_date?: string | null;
  archive_reason?: string | null;
  login?: string | null;
  user_id?: number | null;
  account?: UserAccountInfo | null;
  school?: SchoolRef & { code?: string | null };
  school_id?: number | null;
  school_ids?: TeacherOptionsSchool[];
  classes: Ref[];
  subjects: Ref[];
  status: string;
  active?: boolean;
  qualification: string | null;
  specialization: string | null;
  teacher_type?: string | null;
  weekly_hours_target?: number | null;
  weekly_hours_max?: number | null;
  max_continuous_minutes?: number | null;
  prefer_compact_schedule?: boolean;
  assignments?: TeacherAssignmentRef[];
  availability?: unknown[];
  exceptions?: unknown[];
}

export type TeacherProfileFormState = {
  name: string;
  nameAr: string;
  nameFr: string;
  code: string;
  phone: string;
  mobile: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  hireDate: string;
  contractType: string;
  specialization: string;
  login: string;
  teacherType: string;
  qualification: string;
  weeklyHoursTarget: string;
  weeklyHoursMax: string;
  maxContinuousMinutes: string;
  preferCompactSchedule: boolean;
  status: string;
  active: boolean;
  schoolId: string;
  schoolIds: string[];
};

export type TeacherProfileFieldErrors = Partial<
  Record<
    | 'name'
    | 'nameAr'
    | 'nameFr'
    | 'gender'
    | 'dateOfBirth'
    | 'hireDate'
    | 'contractType'
    | 'specialization'
    | 'teacherType'
    | 'qualification'
    | 'weeklyHoursTarget'
    | 'weeklyHoursMax'
    | 'maxContinuousMinutes'
    | 'status'
    | 'schoolId'
    | 'schoolIds'
    | 'active',
    string
  >
>;

export type TeacherProfileValidationResult = {
  valid: boolean;
  errors: TeacherProfileFieldErrors;
  globalError?: string;
};

export type TeacherProfilePayload = Record<string, unknown>;

/** Atomic create assignment line — Odoo teacher create contract (no weekly_hours). */
export type TeacherCreateAssignmentInput = {
  class_id: number;
  subject_id: number;
  role?: 'main' | 'assistant' | 'substitute' | 'co_teacher' | 'co';
};

/** Simplified teacher create request — automatic account is backend-owned. */
export type TeacherCreateRequest = {
  name: string;
  name_ar?: string | null;
  name_fr?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  school_id?: number | null;
  school_ids?: number[];
  /** Internal default only — not shown on simplified create UI. */
  teacher_type?: string;
  status?: string;
  active?: boolean;
  assignments?: TeacherCreateAssignmentInput[];
};

export type TeacherCreateAccountResult = {
  requested?: boolean;
  created: boolean;
  user_id?: number | null;
  status: string;
  login?: string | null;
  password_was_set: boolean;
  can_login: boolean;
};

export type TeacherCreateAssignmentsResult = {
  requested: number;
  created: number;
  items?: unknown[];
};

export type TeacherCreateLifecycleResult = {
  teacher_registered: boolean;
  has_account: boolean;
  can_login: boolean;
  has_assignments: boolean;
  assignments_count: number;
};

/** Normalized create response used by readiness summary. */
export type TeacherCreateResult = {
  teacher_id: number;
  name?: string | null;
  code?: string | null;
  account: TeacherCreateAccountResult;
  assignments: TeacherCreateAssignmentsResult;
  lifecycle: TeacherCreateLifecycleResult;
  warnings?: string[];
  allowed_actions?: string[];
  raw?: unknown;
};
