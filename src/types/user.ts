// Authenticated user — mirrors API_REPORT.md §3 and RBAC Admin-1.

import type { PermissionsMode } from '@/types/academic-setup';
import type { Permission } from './permissions';
import type { AdminScope, ScopeType } from './scope';
import type { SchoolRef } from './api';

export type Role = 'admin' | 'teacher' | 'parent' | 'student';

export type AdminKind =
  | 'project_manager'
  | 'school_manager'
  | 'general_supervisor'
  | 'admin_staff'
  | 'legacy_admin'
  | 'super_admin'
  | string;

export interface AdminBinding {
  school_id: number;
  school_name?: string;
  admin_kind?: AdminKind;
  [key: string]: unknown;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string | null;
  role: Role;
  permissions: Permission[];
  /** When returned by /me — authoritative effective grants for the active school. */
  effective_permissions?: Permission[];
  /** Capability codes from GET /me — e.g. students.import */
  effective_capabilities?: string[];
  permissions_mode?: PermissionsMode;
  capabilities_editable?: boolean;
  school: SchoolRef | null;

  admin_kind?: AdminKind;
  school_ids?: number[];
  /** Allowed schools from GET /me — [{ id, name }]. Primary source for switcher labels. */
  schools?: SchoolRef[];
  /** When returned by /me; used only if active_school_id is unset. */
  default_school_id?: number;
  active_school_id?: number;
  scopes?: AdminScope[];
  bindings?: AdminBinding[];

  profile_id?: number;
  code?: string;
  scope?: AdminScope;
  /** Top-level /me fields when returned by Odoo (mirrors scope.type / scopes.length). */
  scope_type?: ScopeType;
  scopes_count?: number;
  is_super_admin?: boolean;
}

export interface MeResponse {
  user: CurrentUser;
}
