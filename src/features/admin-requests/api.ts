'use client';

import { api } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';
import type { AdminRequest, AdminRequestRole } from './types';

type FamilyRole = Exclude<AdminRequestRole, 'admin'>;

function familyBase(role: FamilyRole): '/parent/admin-requests' | '/student/admin-requests' {
  return role === 'parent' ? '/parent/admin-requests' : '/student/admin-requests';
}

/** Client payload allow-list. Identity, school, workflow and audit fields never leave the UI. */
export function createRequestPayload(input: {
  type_id: number;
  subject: string;
  description: string;
  student_id?: number;
  upload_session_id?: string;
}) {
  return {
    type_id: input.type_id,
    subject: input.subject.trim(),
    description: input.description.trim(),
    ...(input.student_id ? { student_id: input.student_id } : {}),
    ...(input.upload_session_id ? { upload_session_id: input.upload_session_id } : {}),
  };
}

export function replyPayload(input: { body: string; upload_session_id?: string }) {
  return {
    body: input.body.trim(),
    ...(input.upload_session_id ? { upload_session_id: input.upload_session_id } : {}),
  };
}

export async function createAdminRequest(
  role: FamilyRole,
  input: Parameters<typeof createRequestPayload>[0],
): Promise<ApiResponse<AdminRequest>> {
  return api.post<AdminRequest>(familyBase(role), createRequestPayload(input));
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

export type UploadSession = {
  public_id: string;
  credential: string;
};

/** Starts a session that may be consumed only by the eventual request/reply workflow. */
export async function createAdminRequestUploadSession(): Promise<ApiResponse<UploadSession>> {
  return api.post<UploadSession>('/attachments/upload-sessions', { purpose: 'admin_request' });
}

export async function uploadAdminRequestFile(
  session: UploadSession,
  file: File,
): Promise<ApiResponse<unknown>> {
  const form = new FormData();
  form.append('file', file);
  return api.uploadForm(
    `/attachments/upload-sessions/${session.public_id}/files`,
    form,
    undefined,
    { 'X-Upload-Session-Credential': session.credential },
  );
}
