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
};

/** Normalized teacher form options from GET /admin/teachers/options. */
export type TeacherOptions = {
  teacherTypes: TeacherOption[];
  qualifications: TeacherOption[];
  contractTypes: TeacherOption[];
  statuses: TeacherOption[];
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
  };
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
  email: string | null;
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
  code: string;
  phone: string;
  email: string;
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
};

export type TeacherProfileFieldErrors = Partial<
  Record<
    | 'name'
    | 'teacherType'
    | 'qualification'
    | 'weeklyHoursTarget'
    | 'weeklyHoursMax'
    | 'maxContinuousMinutes'
    | 'status'
    | 'schoolId'
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
