// Academic setup API types — synced with School API v1 admin setup endpoints.

import type { Ref, SchoolRef } from './api';
import type { UserAccountInfo } from './account';

export type ApiWarning = {
  code: string;
  message?: string;
  severity?: 'warning' | 'error' | 'info';
};

export type TeachingAssignmentRole = 'main' | 'assistant' | 'substitute' | 'co_teacher';

export interface TeachingAssignment {
  id: number;
  school: SchoolRef;
  class: {
    id: number;
    name: string;
    level_id?: number | null;
    level_name?: string | null;
  };
  subject: {
    id: number;
    name: string;
    code?: string | null;
  };
  teacher: {
    id: number;
    name: string;
    teacher_type?: string | null;
  };
  weekly_hours: number;
  role: TeachingAssignmentRole;
  state: string;
  active: boolean;
  warnings?: ApiWarning[];
  notes?: string | null;
}

export type AssignmentSuggestionLabel =
  | 'recommended'
  | 'suitable'
  | 'review'
  | 'not_recommended'
  | 'ineligible';

export interface TeachingAssignmentSuggestion {
  teacher: {
    id: number;
    name: string;
    teacher_type?: string | null;
  };
  label: AssignmentSuggestionLabel;
  eligible: boolean;
  current_hours?: number;
  target_hours?: number;
  max_hours?: number;
  reasons: string[];
  warnings?: ApiWarning[];
}

export interface TeachingAssignmentSuggestionsResponse {
  class_id: number;
  subject_id: number;
  suggestions: TeachingAssignmentSuggestion[];
}

export type StaffAdminKind =
  | 'project_manager'
  | 'school_manager'
  | 'general_supervisor'
  | 'admin_staff';

export type PermissionsMode =
  | 'full_school'
  | 'assigned'
  | 'scoped'
  | 'full_platform';

export interface RolePermissionMetadata {
  permissions_mode?: PermissionsMode;
  capabilities_editable?: boolean;
}

export interface StaffAdminKindOption extends RolePermissionMetadata {
  value: StaffAdminKind;
  label: string;
}

export type StaffAccountStatus = 'active' | 'suspended' | 'inactive' | 'no_school';

export type StaffStatusFilter = 'active' | 'inactive' | 'all';

export type StaffAction =
  | 'deactivated'
  | 'already_inactive'
  | 'reactivated'
  | 'already_active';

export interface StaffMutationResult {
  action?: StaffAction;
  item?: Partial<StaffMember>;
  account?: UserAccountInfo;
  warnings?: ApiWarning[];
}

export interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  login?: string | null;
  phone: string | null;
  job_title: string | null;
  admin_kind: StaffAdminKind;
  permissions_mode?: PermissionsMode;
  capabilities_editable?: boolean;
  assigned_capabilities?: string[];
  effective_permissions?: string[];
  active: boolean;
  account_status: StaffAccountStatus;
  can_deactivate?: boolean;
  can_reactivate?: boolean;
  schools: SchoolRef[];
  default_school: SchoolRef | null;
  permissions: string[];
  scope_summary?: {
    type?: string;
    levels_count?: number;
    classes_count?: number;
  };
  capabilities?: string[];
  user_id?: number | null;
  account?: UserAccountInfo | null;
}

export interface StaffCapabilityOption {
  id: number;
  code: string;
  category: string;
  label: string;
  grantable: boolean;
}

export interface StaffOptions {
  admin_kinds: StaffAdminKindOption[];
  schools: (SchoolRef & { code?: string })[];
  levels?: Ref[];
  classes?: Ref[];
  capabilities: StaffCapabilityOption[];
  role_templates?: StaffRoleTemplate[];
  scope_types?: { value: string; label: string }[];
}

export interface StaffRoleTemplate extends RolePermissionMetadata {
  admin_kind: StaffAdminKind;
  label?: string;
}

export interface AcademicTrack {
  id: number;
  name: string;
  code: string;
  active: boolean;
  sequence?: number;
  school: SchoolRef;
  level: Ref & { code?: string | null; supports_tracks?: boolean };
  classes_count: number;
  subjects_count: number;
  can_update: boolean;
  can_delete: boolean;
  subjects?: { id: number; name: string; source?: 'level' | 'track' }[];
}

export interface TrackOptionsLevel {
  id: number;
  name: string;
  code?: string | null;
  supports_tracks: boolean;
}

export interface TrackOptions {
  levels: TrackOptionsLevel[];
  reference_tracks: {
    id: number;
    name: string;
    code?: string;
    level_id?: number;
  }[];
  permissions?: { can_view?: boolean; can_manage?: boolean };
}

export type ReadinessStatus =
  | 'not_started'
  | 'incomplete'
  | 'needs_attention'
  | 'ready'
  | 'blocked';

export type SetupIssueSeverity = 'error' | 'warning' | 'info';

export type SetupIssueSection =
  | 'assignments'
  | 'classes'
  | 'teachers'
  | 'tracks'
  | 'staff'
  | 'subjects'
  | 'levels';

export interface SetupReadinessIssue {
  id: string;
  code: string;
  severity: SetupIssueSeverity;
  blocking: boolean;
  title: string;
  description?: string;
  domain: string;
  entity?: { type: string; id: number | string };
  context?: Record<string, unknown>;
  target: {
    section: SetupIssueSection | string;
    query?: Record<string, string | number | boolean>;
  };
}

export interface SetupQuickAction {
  code: string;
  section: SetupIssueSection | string;
  count: number;
  priority?: number;
}

export interface SetupReadinessDomain {
  score: number;
  status: ReadinessStatus;
  summary: Record<string, number>;
}

export interface SetupReadinessPayload {
  school: SchoolRef;
  scope: {
    type: string;
    is_full_school: boolean;
  };
  readiness: {
    score: number;
    status: ReadinessStatus;
    blocking_issues: number;
    warnings: number;
    information: number;
    ready_for_timetable_setup: boolean;
    calculated_at?: string;
  };
  domains: {
    levels_classes?: SetupReadinessDomain;
    subjects_tracks?: SetupReadinessDomain;
    teachers?: SetupReadinessDomain;
    staff?: SetupReadinessDomain;
    assignments?: SetupReadinessDomain;
  };
  issues: SetupReadinessIssue[];
  issues_total?: number;
  quick_actions?: SetupQuickAction[];
}
