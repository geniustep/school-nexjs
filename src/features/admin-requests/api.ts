'use client';

import { api } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';
import type {
  AdminRequest,
  AdminRequestAppointmentPeriod,
  AdminRequestAppointmentSubject,
  AdminRequestAppointmentTargetKind,
  AdminRequestFamilyRole,
  AdminRequestType,
} from './types';

type FamilyRole = AdminRequestFamilyRole;
export type AdminRequestReviewOutcome = 'waiting_requester' | 'resolved';

function familyBase(role: FamilyRole): '/parent/admin-requests' | '/student/admin-requests' {
  return role === 'parent' ? '/parent/admin-requests' : '/student/admin-requests';
}

export type AdminRequestAppointmentInput = {
  target_kind: AdminRequestAppointmentTargetKind;
  preferred_date: string;
  preferred_period: AdminRequestAppointmentPeriod;
  requested_subject_id?: number;
};

/** Client payload allow-list. Identity, school, workflow and audit fields never leave the UI. */
export function createRequestPayload(input: {
  type_id: number;
  subject: string;
  description: string;
  student_id?: number;
  upload_session_id?: string;
  appointment?: AdminRequestAppointmentInput;
}) {
  return {
    type_id: input.type_id,
    subject: input.subject.trim(),
    description: input.description.trim(),
    ...(input.student_id ? { student_id: input.student_id } : {}),
    ...(input.upload_session_id ? { upload_session_id: input.upload_session_id } : {}),
    ...(input.appointment ? { appointment: input.appointment } : {}),
  };
}

export function replyPayload(input: { body: string; upload_session_id?: string }) {
  return {
    body: input.body.trim(),
    ...(input.upload_session_id ? { upload_session_id: input.upload_session_id } : {}),
  };
}

export const staffReplyPayload = replyPayload;

export function approveReplyPayload(input: {
  reply_id: number;
  outcome?: AdminRequestReviewOutcome;
  reason?: string;
  resolution_summary?: string;
}) {
  return {
    reply_id: input.reply_id,
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    ...(input.resolution_summary?.trim()
      ? { resolution_summary: input.resolution_summary.trim() }
      : {}),
  };
}

export function requestReplyChangesPayload(input: { reply_id: number; reason: string }) {
  return {
    reply_id: input.reply_id,
    reason: input.reason.trim(),
  };
}

export async function createAdminRequest(
  role: FamilyRole,
  input: Parameters<typeof createRequestPayload>[0],
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(familyBase(role), createRequestPayload(input));
}

export async function getAppointmentSubjects(
  role: FamilyRole,
  studentId?: number,
): Promise<ApiResponse<AdminRequestAppointmentSubject[]>> {
  const query = role === 'parent' && studentId ? `?student_id=${studentId}` : '';
  return api.get<AdminRequestAppointmentSubject[]>(`${familyBase(role)}/appointment-subjects${query}`);
}

export async function postConfirmAppointment(
  role: FamilyRole,
  requestId: string,
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(`${familyBase(role)}/${requestId}/confirm-appointment`);
}

export async function postRequestAppointmentChange(
  role: FamilyRole,
  requestId: string,
  input: { body: string; upload_session_id?: string },
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `${familyBase(role)}/${requestId}/request-appointment-change`,
    replyPayload(input),
  );
}

export async function postProposeAppointment(
  requestId: string,
  input: { scheduled_start: string; scheduled_end: string },
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `/admin/admin-requests/${requestId}/propose-appointment`,
    input,
  );
}

export async function postRequesterAction(
  role: FamilyRole,
  requestId: string,
  action: 'submit' | 'cancel' | 'reply',
  body?: { body: string; upload_session_id?: string },
): Promise<ApiResponse<AdminRequest>> {
  const path = `${familyBase(role)}/${requestId}/${action}`;
  return api.post<AdminRequest>(path, action === 'reply' ? replyPayload(body ?? { body: '' }) : undefined);
}

export async function postAdminAction(
  requestId: string,
  action: string,
  body?: { reason?: string; resolution_summary?: string; assigned_user_id?: number },
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `/admin/admin-requests/${requestId}/${action.replaceAll('_', '-')}`,
    body?.reason || body?.resolution_summary || body?.assigned_user_id
      ? {
          ...(body.reason ? { reason: body.reason.trim() } : {}),
          ...(body.resolution_summary ? { resolution_summary: body.resolution_summary.trim() } : {}),
          ...(body.assigned_user_id ? { assigned_user_id: body.assigned_user_id } : {}),
        }
      : undefined,
  );
}

export async function postStaffReply(
  requestId: string,
  input: { body: string; upload_session_id?: string },
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `/staff/admin-requests/${requestId}/reply`,
    staffReplyPayload(input),
  );
}

export async function postAdminApproveReply(
  requestId: string,
  input: Parameters<typeof approveReplyPayload>[0],
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `/admin/admin-requests/${requestId}/approve-reply`,
    approveReplyPayload(input),
  );
}

export async function postAdminRequestReplyChanges(
  requestId: string,
  input: Parameters<typeof requestReplyChangesPayload>[0],
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(
    `/admin/admin-requests/${requestId}/request-reply-changes`,
    requestReplyChangesPayload(input),
  );
}

export type UploadSession = {
  public_id: string;
  credential: string;
};

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Stable per browser-selected file so retries remain idempotent inside one upload session. */
export function adminRequestFileClientItemId(
  file: Pick<File, 'name' | 'size' | 'lastModified'>,
): string {
  const fingerprint = `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
  return `arq-${file.lastModified.toString(36)}-${file.size.toString(36)}-${stableHash(fingerprint)}`;
}

export function adminRequestUploadSessionPayload(adminRequestId?: number | string) {
  return {
    purpose: 'admin_request' as const,
    ...(adminRequestId !== undefined && adminRequestId !== null && String(adminRequestId).trim()
      ? { admin_request_id: adminRequestId }
      : {}),
  };
}

/** Family sessions stay unbound; assigned staff sessions are explicitly bound to the request. */
export async function createAdminRequestUploadSession(
  adminRequestId?: number | string,
): Promise<ApiResponse<UploadSession>> {
  return api.post<UploadSession>(
    '/attachments/upload-sessions',
    adminRequestUploadSessionPayload(adminRequestId),
  );
}

export async function uploadAdminRequestFile(
  session: UploadSession,
  file: File,
): Promise<ApiResponse<unknown>> {
  const form = new FormData();
  form.append('file', file);
  form.append('client_item_id', adminRequestFileClientItemId(file));
  return api.uploadForm(
    `/attachments/upload-sessions/${session.public_id}/files`,
    form,
    undefined,
    { 'X-Upload-Session-Credential': session.credential },
  );
}

export type AdminRequestTypeSettingsInput = {
  name: string;
  active?: boolean;
  sequence?: number;
  confidential?: boolean;
  allow_parent?: boolean;
  allow_student?: boolean;
  requires_student?: boolean;
  default_priority?: 'normal' | 'important' | 'urgent';
  default_assignee_user_id?: number | null;
};

export async function createAdminRequestType(
  input: AdminRequestTypeSettingsInput,
): Promise<ApiResponse<AdminRequestType>> {
  return api.post<AdminRequestType>('/admin/admin-requests/types', input);
}

export async function updateAdminRequestType(
  typeId: number,
  input: AdminRequestTypeSettingsInput,
): Promise<ApiResponse<AdminRequestType>> {
  return api.post<AdminRequestType>(`/admin/admin-requests/types/${typeId}/update`, input);
}
