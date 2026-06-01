'use client';

// Secure attachment operations via same-origin BFF (session cookies).

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AttachmentMeta } from '@/types/attachment';

export type AttachmentDownloadError = 'forbidden' | 'not_found' | 'network' | 'unknown';
export type AttachmentManageRole = 'teacher' | 'admin';

export interface AttachmentDownloadResult {
  ok: boolean;
  error?: AttachmentDownloadError;
  message?: string;
}

export interface AttachmentActionResult {
  ok: boolean;
  message?: string;
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

function mapStatusMessage(status: number): string {
  if (status === 403) return 'errors.attachmentForbidden';
  if (status === 404) return 'errors.attachmentNotFound';
  return 'errors.attachmentFailed';
}

/** Download an attachment through `/api/attachments/:id/download`. */
export async function downloadAttachment(
  id: number,
  filename: string,
): Promise<AttachmentDownloadResult> {
  try {
    const res = await fetch(`/api/attachments/${id}/download`, { method: 'GET' });
    if (!res.ok) {
      return { ok: false, error: 'unknown', message: mapStatusMessage(res.status) };
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true };
  } catch {
    return { ok: false, error: 'network', message: 'errors.network' };
  }
}

/** Fetch preview bytes for text display. */
export async function fetchAttachmentPreviewText(id: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/attachments/${id}/preview`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function deletePath(id: number, role: AttachmentManageRole): string {
  return role === 'teacher'
    ? endpoints.teacher.attachmentDelete(id)
    : endpoints.admin.attachmentDelete(id);
}

function replacePath(id: number, role: AttachmentManageRole): string {
  return role === 'teacher'
    ? endpoints.teacher.attachmentReplace(id)
    : endpoints.admin.attachmentReplace(id);
}

function mapApiActionError(code: string): string {
  switch (code) {
    case 'permission_denied':
      return 'errors.attachmentForbidden';
    case 'not_found':
      return 'errors.attachmentNotFound';
    default:
      return 'errors.attachmentFailed';
  }
}

export async function deleteAttachment(
  id: number,
  role: AttachmentManageRole,
): Promise<AttachmentActionResult> {
  const res = await api.delete<{ attachment?: AttachmentMeta }>(deletePath(id, role));
  if (res.success) return { ok: true, message: 'attachments.deletedSuccess' };
  return { ok: false, message: mapApiActionError(res.error.code) };
}

export async function replaceAttachment(
  id: number,
  file: File,
  role: AttachmentManageRole,
): Promise<AttachmentActionResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.uploadForm<{ attachment?: AttachmentMeta }>(replacePath(id, role), fd);
  if (res.success) return { ok: true, message: 'attachments.replacedSuccess' };
  return { ok: false, message: mapApiActionError(res.error.code) };
}
