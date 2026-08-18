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

export interface StaffResponsibilityAssignmentMutationPayload {
  item: StaffResponsibilityAssignment;
}

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
  return item.origin === 'manual' && item.allowed_actions?.edit === true;
}

export function canEndStaffResponsibilityAssignment(item: StaffResponsibilityAssignment): boolean {
  return item.origin === 'manual' && item.allowed_actions?.end === true;
}

export async function fetchStaffResponsibilityAssignments(
  staffId: number,
): Promise<ApiResponse<StaffResponsibilityAssignmentsPayload>> {
  return api.get<StaffResponsibilityAssignmentsPayload>(
    staffResponsibilityAssignmentEndpoints.collection(staffId),
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
