import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { clientActiveRoleHeaders } from '@/lib/auth/active-role-client';
import type {
  AnnouncementDelivery,
  AnnouncementListPage,
  AnnouncementMarkReadResult,
} from '@/types/announcement-delivery';
import type { ApiErrorBody, Pagination } from '@/types/api';
import {
  normalizeAnnouncementDelivery,
  normalizeAnnouncementList,
  normalizeMarkReadResult,
  readUnreadCount,
} from './normalize-announcement';

export type AnnouncementsQuery = {
  page?: number;
  page_size?: number;
  /** Parent-child filter only — Backend validates guardian link. */
  student_id?: number;
};

export type AnnouncementsApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorBody };

function paginationFromMeta(meta: Record<string, unknown> | null | undefined, fallbackLen: number): Pagination {
  const pag = (meta?.pagination ?? meta) as Record<string, unknown> | undefined;
  const page = Number(pag?.page ?? 1);
  const pageSize = Number(pag?.page_size ?? pag?.limit ?? 20);
  const total = Number(pag?.total ?? fallbackLen);
  const totalPages = Number(
    pag?.total_pages ??
      (Number.isFinite(pageSize) && pageSize > 0 ? Math.ceil(total / pageSize) : 1),
  );
  return {
    page: Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1,
    page_size: Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : 20,
    total: Number.isFinite(total) && total >= 0 ? Math.trunc(total) : fallbackLen,
    total_pages: Number.isFinite(totalPages) && totalPages > 0 ? Math.trunc(totalPages) : 1,
  };
}

function queryParams(query?: AnnouncementsQuery): Record<string, string | number | undefined> {
  return {
    page: query?.page,
    page_size: query?.page_size,
    student_id: query?.student_id,
  };
}

export async function fetchAnnouncementList(
  query?: AnnouncementsQuery,
): Promise<AnnouncementsApiResult<AnnouncementListPage>> {
  const res = await api.get<unknown>(endpoints.communication.announcements, queryParams(query));
  if (!res.success) return { ok: false, error: res.error };
  const items = normalizeAnnouncementList(res.data);
  const pagination = paginationFromMeta(res.meta as Record<string, unknown>, items.length);
  return {
    ok: true,
    data: {
      items,
      page: pagination.page,
      page_size: pagination.page_size,
      total: pagination.total,
      total_pages: pagination.total_pages,
      unread_count: readUnreadCount(res.meta as Record<string, unknown>),
    },
  };
}

export async function fetchAnnouncementDetail(
  messageId: number,
  query?: Pick<AnnouncementsQuery, 'student_id'>,
): Promise<AnnouncementsApiResult<AnnouncementDelivery>> {
  const res = await api.get<unknown>(
    endpoints.communication.announcement(messageId),
    queryParams(query),
  );
  if (!res.success) return { ok: false, error: res.error };
  const item = normalizeAnnouncementDelivery(res.data, { detail: true });
  if (!item) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Announcement not found.', details: {} },
    };
  }
  return { ok: true, data: item };
}

export async function markAnnouncementRead(
  messageId: number,
  query?: Pick<AnnouncementsQuery, 'student_id'>,
): Promise<AnnouncementsApiResult<AnnouncementMarkReadResult>> {
  const res = await api.post<unknown>(
    endpoints.communication.announcementRead(messageId),
    {},
    queryParams(query),
  );
  if (!res.success) return { ok: false, error: res.error };
  const data = normalizeMarkReadResult(res.data);
  if (!data) {
    return {
      ok: false,
      error: { code: 'server_error', message: 'Unexpected mark-read response.', details: {} },
    };
  }
  return { ok: true, data };
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type AnnouncementAttachmentDownloadResult =
  | { ok: true }
  | { ok: false; status: number; messageKey: string };

/** Authenticated download via BFF proxy — no public Odoo URL exposed. */
export async function downloadAnnouncementAttachment(
  messageId: number,
  attachmentId: number,
  filename: string,
  studentId?: number,
): Promise<AnnouncementAttachmentDownloadResult> {
  const path = endpoints.communication.announcementAttachmentDownload(messageId, attachmentId);
  const sp = new URLSearchParams();
  if (studentId != null) sp.set('student_id', String(studentId));
  const qs = sp.toString();
  const url = `/api/odoo${path}${qs ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: '*/*',
        ...clientActiveRoleHeaders(),
      },
    });
    if (!res.ok) {
      const messageKey =
        res.status === 401 || res.status === 403
          ? 'errors.attachmentForbidden'
          : res.status === 404
            ? 'errors.attachmentNotFound'
            : 'errors.attachmentFailed';
      return { ok: false, status: res.status, messageKey };
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, filename || 'file');
    return { ok: true };
  } catch {
    return { ok: false, status: 0, messageKey: 'errors.network' };
  }
}
