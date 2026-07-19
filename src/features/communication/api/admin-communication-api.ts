'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeRecipientPreviewResponse } from '@/features/communication/utils/normalize-recipient-summary';
import type { ApiErrorBody, ApiResponse, ListParams } from '@/types/api';
import type {
  CommunicationContent,
  CommunicationRecipientPreviewResponse,
} from '@/types/communication';

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
