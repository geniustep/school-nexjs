'use client';

// Secure attachment download via same-origin BFF (session cookies).

export type AttachmentDownloadError = 'forbidden' | 'not_found' | 'network' | 'unknown';

export interface AttachmentDownloadResult {
  ok: boolean;
  error?: AttachmentDownloadError;
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

/** Download an attachment through `/api/attachments/:id/download`. */
export async function downloadAttachment(
  id: number,
  filename: string,
): Promise<AttachmentDownloadResult> {
  try {
    const res = await fetch(`/api/attachments/${id}/download`, { method: 'GET' });
    if (res.status === 403) {
      return { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' };
    }
    if (res.status === 404) {
      return { ok: false, error: 'not_found', message: 'errors.attachmentNotFound' };
    }
    if (!res.ok) {
      return { ok: false, error: 'unknown', message: 'errors.attachmentFailed' };
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true };
  } catch {
    return { ok: false, error: 'network', message: 'errors.network' };
  }
}
