'use client';

import { clientActiveRoleHeaders } from '@/lib/auth/active-role-client';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';

const BFF_BASE = '/api/odoo';

function bffUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BFF_BASE}${clean}`;
}

async function responseError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    const raw = payload.error?.message || `Request failed (${response.status}).`;
    return new Error(sanitizeClientApiErrorMessage(raw));
  } catch {
    return new Error(`Request failed (${response.status}).`);
  }
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function filenameFromContentDisposition(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;
  const utf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8.replace(/^['"]|['"]$/g, ''));
    } catch {
      return utf8;
    }
  }
  const plain = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim();
  return plain || fallback;
}

export async function downloadEntryRequirementTemplate(path: string): Promise<void> {
  const response = await fetch(bffUrl(path), {
    method: 'GET',
    credentials: 'include',
    headers: clientActiveRoleHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw await responseError(response);
  const blob = await response.blob();
  const filename = filenameFromContentDisposition(
    response.headers.get('content-disposition'),
    'entry-requirements-template.xlsx',
  );
  const href = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(href);
  }
}

export async function uploadEntryRequirementAttachments<T>(
  path: string,
  files: readonly File[],
): Promise<T> {
  const formData = new FormData();
  for (const file of files) formData.append('files', file, file.name);
  const response = await fetch(bffUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: clientActiveRoleHeaders(),
    body: formData,
  });
  if (!response.ok) throw await responseError(response);
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!payload.success) {
    throw new Error(sanitizeClientApiErrorMessage(payload.error?.message || 'تعذر رفع المرفق.'));
  }
  return payload.data as T;
}

export function authenticatedAttachmentDownloadHref(attachmentId: number | string): string {
  return `${BFF_BASE}/attachments/${encodeURIComponent(String(attachmentId))}/download`;
}
