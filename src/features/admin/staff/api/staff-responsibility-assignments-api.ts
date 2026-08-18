'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';

export type StaffResponsibilityAssignmentOrigin = 'legacy_header' | 'manual' | (string & {});
export type StaffResponsibilityAssignmentScopeType =
  | 'school'
  | 'cycle'
  | 'levels'
  | 'classes'
  | (string & {});
export type StaffResponsibilityAssignmentYearPolicy =
  | 'bound'
  | 'follows_request_context'
  | 'unbounded'
  | (string & {});

export interface StaffResponsibilityAssignmentCapability {
  id: number;
  code: string;
  label?: string | null;
}

export interface StaffResponsibilityAssignmentActorRef {
  id: number | null;
  name: string | null;
}

export interface StaffResponsibilityAssignmentAllowedActions {
  view?: boolean;
  edit?: boolean;
  end?: boolean;
}

export interface StaffResponsibilityAssignment {
  id: number;
  origin: StaffResponsibilityAssignmentOrigin;
  scope_type: StaffResponsibilityAssignmentScopeType;
  cycle_ids: number[];
  level_ids: number[];
  class_ids: number[];
  capability_codes: string[];
  capabilities?: StaffResponsibilityAssignmentCapability[];
  year_policy: StaffResponsibilityAssignmentYearPolicy;
  academic_year_id: number | null;
  active: boolean;
  state: string;
  effective_from: string | null;
  effective_to: string | null;
  is_effective: boolean;
  assigned_by?: StaffResponsibilityAssignmentActorRef;
  created_at?: string | null;
  ended_at?: string | null;
  end_reason?: string | null;
  ended_by?: StaffResponsibilityAssignmentActorRef;
  allowed_actions?: StaffResponsibilityAssignmentAllowedActions;
}

export interface StaffResponsibilityAssignmentsPayload {
  items: StaffResponsibilityAssignment[];
  total: number;
}

export interface StaffResponsibilityAssignmentsSummary {
  total: number;
  active: number;
  manual_count: number;
  legacy_header_count: number;
}

export interface StaffResponsibilityAssignmentMutationPayload {
  item: StaffResponsibilityAssignment;
}

/** Client writable fields only. Server-owned identity/provenance is intentionally absent. */
export interface StaffResponsibilityAssignmentWritePayload {
  scope_type: StaffResponsibilityAssignmentScopeType;
  cycle_ids?: number[];
  level_ids?: number[];
  class_ids?: number[];
  capability_codes: string[];
  year_policy: StaffResponsibilityAssignmentYearPolicy;
  academic_year_id?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type StaffResponsibilityAssignmentUpdatePayload =
  Partial<StaffResponsibilityAssignmentWritePayload>;

export interface StaffResponsibilityAssignmentEndPayload {
  end_reason?: string;
}

export interface StaffResponsibilityAssignmentSource {
  assignment_id: number;
  origin: StaffResponsibilityAssignmentOrigin;
  scope_type: StaffResponsibilityAssignmentScopeType;
  cycle_ids: number[];
  level_ids: number[];
  class_ids: number[];
  year_policy: StaffResponsibilityAssignmentYearPolicy;
  academic_year_id: number | null;
  effective_from: string | null;
  effective_to: string | null;
  is_effective: boolean;
}

export interface StaffEffectiveCapabilityExplanation {
  code: string;
  label?: string | null;
  allowed?: boolean;
  source?: string | null;
  assignment_ids?: number[];
  assignment_sources?: StaffResponsibilityAssignmentSource[];
  staff_relationship_status?: unknown;
  denied_reason?: string | null;
}

export interface StaffEffectivePermissionsExplainedPayload {
  user_id?: number;
  school_id?: number;
  admin_kind?: string | null;
  permissions_mode?: string | null;
  assigned_capabilities?: string[];
  effective_capabilities?: string[];
  effective_permissions?: string[];
  permissions?: string[];
  capabilities?: StaffEffectiveCapabilityExplanation[];
  warnings?: unknown[];
}

/**
 * Responsibility-assignment paths extend the canonical staffMember endpoint.
 * This keeps /admin/staff centralized in src/lib/api/endpoints.ts and prevents
 * feature components from hard-coding API v1 paths.
 */
export const staffResponsibilityAssignmentEndpoints = {
  collection(staffId: number | string) {
    return `${endpoints.admin.staffMember(staffId)}/responsibility-assignments`;
  },
  item(staffId: number | string, assignmentId: number | string) {
    return `${this.collection(staffId)}/${assignmentId}`;
  },
  end(staffId: number | string, assignmentId: number | string) {
    return `${this.item(staffId, assignmentId)}/end`;
  },
};

export function canEditStaffResponsibilityAssignment(item: StaffResponsibilityAssignment): boolean {
  return (
    item.origin === 'manual' &&
    item.active === true &&
    item.state === 'active' &&
    item.allowed_actions?.edit === true
  );
}

export function canEndStaffResponsibilityAssignment(item: StaffResponsibilityAssignment): boolean {
  return (
    item.origin === 'manual' &&
    item.active === true &&
    item.state === 'active' &&
    item.allowed_actions?.end === true
  );
}

export async function fetchStaffResponsibilityAssignments(
  staffId: number,
): Promise<ApiResponse<StaffResponsibilityAssignmentsPayload>> {
  return api.get<StaffResponsibilityAssignmentsPayload>(
    staffResponsibilityAssignmentEndpoints.collection(staffId),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseAssignmentsSummary(raw: unknown): StaffResponsibilityAssignmentsSummary | null {
  const envelope = asRecord(raw);
  const item = asRecord(envelope?.item) ?? envelope;
  const summary = asRecord(item?.assignments_summary);
  if (!summary) return null;
  const total = finiteNumber(summary.total);
  const active = finiteNumber(summary.active);
  const manualCount = finiteNumber(summary.manual_count);
  const legacyHeaderCount = finiteNumber(summary.legacy_header_count);
  if (total == null || active == null || manualCount == null || legacyHeaderCount == null) {
    return null;
  }
  return {
    total,
    active,
    manual_count: manualCount,
    legacy_header_count: legacyHeaderCount,
  };
}

/** Read the backend-owned summary from staff detail; never recompute it in the UI. */
export async function fetchStaffResponsibilityAssignmentsSummary(
  staffId: number,
): Promise<ApiResponse<StaffResponsibilityAssignmentsSummary | null>> {
  const response = await api.get<unknown>(endpoints.admin.staffMember(staffId));
  if (!response.success) {
    return response as ApiResponse<StaffResponsibilityAssignmentsSummary | null>;
  }
  return { ...response, data: parseAssignmentsSummary(response.data) };
}

/** Fetch assignment-level provenance without passing through the legacy flat normalizer. */
export async function fetchStaffEffectivePermissionExplanation(
  staffId: number,
): Promise<ApiResponse<StaffEffectivePermissionsExplainedPayload>> {
  return api.get<StaffEffectivePermissionsExplainedPayload>(
    endpoints.admin.staffEffectivePermissions(staffId),
  );
}

export async function createStaffResponsibilityAssignment(
  staffId: number,
  payload: StaffResponsibilityAssignmentWritePayload,
): Promise<ApiResponse<StaffResponsibilityAssignmentMutationPayload>> {
  return api.post<StaffResponsibilityAssignmentMutationPayload>(
    staffResponsibilityAssignmentEndpoints.collection(staffId),
    payload,
  );
}

export async function updateStaffResponsibilityAssignment(
  staffId: number,
  assignmentId: number,
  payload: StaffResponsibilityAssignmentUpdatePayload,
): Promise<ApiResponse<StaffResponsibilityAssignmentMutationPayload>> {
  return api.patch<StaffResponsibilityAssignmentMutationPayload>(
    staffResponsibilityAssignmentEndpoints.item(staffId, assignmentId),
    payload,
  );
}

export async function endStaffResponsibilityAssignment(
  staffId: number,
  assignmentId: number,
  payload: StaffResponsibilityAssignmentEndPayload = {},
): Promise<ApiResponse<StaffResponsibilityAssignmentMutationPayload>> {
  return api.post<StaffResponsibilityAssignmentMutationPayload>(
    staffResponsibilityAssignmentEndpoints.end(staffId, assignmentId),
    payload,
  );
}
