// Authenticated user — mirrors API_REPORT.md §3 (auth/login, /me) and §8.

import type { Permission } from './permissions';
import type { AdminScope } from './scope';
import type { SchoolRef } from './api';

export type Role = 'admin' | 'teacher' | 'parent' | 'student';

export interface CurrentUser {
  id: number;
  name: string;
  email: string | null;
  role: Role;
  permissions: Permission[];
  school: SchoolRef | null;

  // Teacher: school.teacher id + code. Parent: school.parent id.
  // Student: school.student id + code. Absent for plain admin.
  profile_id?: number;
  code?: string;

  // Admin only — see API_REPORT.md §4. Also includes the super-admin flag
  // when the backend exposes it.
  scope?: AdminScope;
  is_super_admin?: boolean;
}

export interface MeResponse {
  user: CurrentUser;
}
