'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeRecipientPreviewResponse } from '@/features/communication/utils/normalize-recipient-summary';
import type { ApiErrorBody, ApiResponse, ListParams } from '@/types/api';
import type {
  CommunicationContent,
  CommunicationRecipientPreviewResponse,
} from '@/types/communication';
import type { RecipientScope } from '@/types/recipient-scope';

export type CreateAdminCommunicationContentInput = {
  subject: string;
  body: string;
  recipient_scope: RecipientScope;
  content_type?: string;
};

export type UpdateAdminCommunicationContentInput = {
  subject?: string;
  body?: string;
  recipient_scope?: RecipientScope;
  content_type?: string;
};

export type IndividualCommunicationSubmitInput = {
  recipient_type: 'teacher' | 'student' | 'guardian';
  recipient_id: number;
  subject: string;
  body: string;
};

export function fetchCommunicationContentList(
  query?: ListParams,
): Promise<ApiResponse<CommunicationContent[]>> {
  return api.get<CommunicationContent[]>(endpoints.admin.communicationContent, query);
}

export function fetchCommunicationApprovals(
  query?: ListParams,
): Promise<ApiResponse<CommunicationContent[]>> {
  return api.get<CommunicationContent[]>(endpoints.admin.communicationApprovals, query);
}

export function fetchCommunicationContentDetail(
  id: number | string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.get<CommunicationContent>(endpoints.admin.communicationContentDetail(id));
}

/** Odoo 259 — create administrative draft with canonical recipient_scope. */
export function createAdminCommunicationContent(
  input: CreateAdminCommunicationContentInput,
): Promise<ApiResponse<CommunicationContent>> {
  const payload: Record<string, unknown> = {
    subject: input.subject,
    body: input.body,
    content_type: input.content_type ?? 'message',
    recipient_scope: input.recipient_scope,
  };
  return api.post<CommunicationContent>(endpoints.admin.communicationContent, payload);
}

/** Odoo 259 — update draft fields / recipient_scope before submit. */
export function updateAdminCommunicationContent(
  id: number | string,
  input: UpdateAdminCommunicationContentInput,
): Promise<ApiResponse<CommunicationContent>> {
  const payload: Record<string, unknown> = {};
  if (input.subject !== undefined) payload.subject = input.subject;
  if (input.body !== undefined) payload.body = input.body;
  if (input.content_type !== undefined) payload.content_type = input.content_type;
  if (input.recipient_scope !== undefined) payload.recipient_scope = input.recipient_scope;
  return api.patch<CommunicationContent>(
    endpoints.admin.communicationContentDetail(id),
    payload,
  );
}

export function approveCommunicationContent(
  id: number | string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.post<CommunicationContent>(endpoints.admin.communicationContentApprove(id), {});
}

export function requestChangesCommunicationContent(
  id: number | string,
  reason: string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.post<CommunicationContent>(endpoints.admin.communicationContentRequestChanges(id), {
    reason,
  });
}

export function publishCommunicationContent(
  id: number | string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.post<CommunicationContent>(endpoints.admin.communicationContentPublish(id), {});
}

export function scheduleCommunicationContent(
  id: number | string,
  scheduledAt: string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.post<CommunicationContent>(endpoints.admin.communicationContentSchedule(id), {
    scheduled_at: scheduledAt,
  });
}

export function cancelCommunicationContent(
  id: number | string,
  reason?: string,
): Promise<ApiResponse<CommunicationContent>> {
  return api.post<CommunicationContent>(endpoints.admin.communicationContentCancel(id), {
    ...(reason ? { reason } : {}),
  });
}

export function fetchCommunicationContentAudit(
  id: number | string,
): Promise<ApiResponse<{ content_id: number; school_id: number; state: string; decisions: unknown[] }>> {
  return api.get(endpoints.admin.communicationContentAudit(id));
}

export function fetchAdminChannelPendingMessages(
  channelId: number | string,
  query?: ListParams,
): Promise<ApiResponse<CommunicationContent[]>> {
  return api.get<CommunicationContent[]>(endpoints.admin.channelPendingMessages(channelId), query);
}

/** Backend 228 — published school.message list for admin (no pending / no unread side effects). */
export function fetchAdminChannelMessages(
  channelId: number | string,
  query?: ListParams & { limit?: number },
): Promise<ApiResponse<unknown[]>> {
  return api.get(endpoints.admin.channelMessages(channelId), {
    page: query?.page ?? 1,
    limit: query?.limit ?? query?.page_size ?? 50,
    ...query,
  });
}

/**
 * Backend 228 — admin author resubmit for changes_requested channel messages.
 * Never use portal `/channels/.../resubmit` for admin accounts.
 */
export function resubmitAdminChannelPendingMessage(
  channelId: number | string,
  contentId: number | string,
  payload: { body: string; subject?: string },
): Promise<ApiResponse<CommunicationContent | Record<string, unknown>>> {
  return api.post(endpoints.admin.channelPendingMessageResubmit(channelId, contentId), {
    body: payload.body,
    ...(payload.subject != null && payload.subject !== ''
      ? { subject: payload.subject }
      : {}),
  });
}

/**
 * Odoo 258+ — generic advisory recipient preview (canonical recipient_scope).
 * Does not create content; never treat as frozen snapshot.
 */
export async function previewAdminRecipientScope(input: {
  recipient_scope: RecipientScope;
  subject?: string;
  body?: string;
}): Promise<
  | { ok: true; preview: CommunicationRecipientPreviewResponse }
  | { ok: false; error: ApiErrorBody }
> {
  const payload: Record<string, unknown> = {
    recipient_scope: input.recipient_scope,
  };
  if (input.subject != null) payload.subject = input.subject;
  if (input.body != null) payload.body = input.body;

  const res = await api.post<unknown>(endpoints.admin.communicationRecipientPreview, payload);
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  const preview = normalizeRecipientPreviewResponse(res.data);
  if (!preview) {
    return {
      ok: false,
      error: {
        code: 'server_error',
        message: 'Unexpected server response.',
        details: {},
      },
    };
  }
  return { ok: true, preview };
}

/**
 * B4 — admin content recipient preview (advisory). Does not approve/publish/submit.
 */
export async function previewAdminCommunicationContentRecipients(
  contentId: number | string,
  body?: Record<string, unknown>,
): Promise<
  | { ok: true; preview: CommunicationRecipientPreviewResponse }
  | { ok: false; error: ApiErrorBody }
> {
  const res = await api.post<unknown>(
    endpoints.admin.communicationContentRecipientPreview(contentId),
    body ?? {},
  );
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  const preview = normalizeRecipientPreviewResponse(res.data);
  if (!preview) {
    return {
      ok: false,
      error: {
        code: 'server_error',
        message: 'Unexpected server response.',
        details: {},
      },
    };
  }
  return { ok: true, preview };
}

/**
 * B4 — staff content recipient preview path (reusable for future staff UI).
 * Teachers currently compose via portal channels; this endpoint is registered for contract reuse.
 */
export async function previewStaffCommunicationContentRecipients(
  contentId: number | string,
  body?: Record<string, unknown>,
): Promise<
  | { ok: true; preview: CommunicationRecipientPreviewResponse }
  | { ok: false; error: ApiErrorBody }
> {
  const res = await api.post<unknown>(
    endpoints.staff.communicationContentRecipientPreview(contentId),
    body ?? {},
  );
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  const preview = normalizeRecipientPreviewResponse(res.data);
  if (!preview) {
    return {
      ok: false,
      error: {
        code: 'server_error',
        message: 'Unexpected server response.',
        details: {},
      },
    };
  }
  return { ok: true, preview };
}

/**
 * Odoo 256 compatibility — individual messaging (domain entity id).
 * Prefer this path for individual submit until administrative content absorbs it.
 */
export function submitIndividualCommunication(
  input: IndividualCommunicationSubmitInput,
): Promise<ApiResponse<unknown>> {
  return api.post(endpoints.admin.communicationIndividual, {
    recipient_type: input.recipient_type,
    recipient_id: input.recipient_id,
    subject: input.subject,
    body: input.body,
  });
}
