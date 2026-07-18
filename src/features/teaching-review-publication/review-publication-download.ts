/**
 * Binary download helper for Teaching Stage 9 print/export paths via BFF.
 * Never transforms PDF bytes; never logs tokens/cookies/binary contents.
 */

const PROXY_BASE = '/api/odoo';

const ALLOWED_PREFIXES = [
  '/admin/teaching/documents/',
  '/admin/teaching/publications/',
  '/admin/teaching/exports/',
  '/teacher/teaching/documents/',
  '/teacher/teaching/publications/',
] as const;

export type TeachingDownloadFailReason =
  | 'forbidden'
  | 'failed'
  | 'network'
  | 'path_not_allowed'
  | 'not_ready';

function isAllowedTeachingDownloadPath(path: string): boolean {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return ALLOWED_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

function isFileContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('application/pdf') ||
    ct.includes('text/csv') ||
    ct.includes('application/csv') ||
    ct.includes('application/zip') ||
    ct.includes('application/json') ||
    ct.includes('application/octet-stream')
  );
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] ?? fallback;
}

async function readJsonError(
  res: Response,
): Promise<{ reason: TeachingDownloadFailReason; message?: string; code?: string }> {
  try {
    const json = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    const code = json.error?.code;
    if (
      code === 'permission_denied' ||
      code === 'forbidden' ||
      code?.endsWith('_forbidden')
    ) {
      return { reason: 'forbidden', message: json.error?.message, code };
    }
    if (code === 'teaching_export_not_ready') {
      return { reason: 'not_ready', message: json.error?.message, code };
    }
    return { reason: 'failed', message: json.error?.message, code };
  } catch {
    return { reason: 'failed' };
  }
}

export async function downloadTeachingBinary(
  path: string,
  fallbackFilename: string,
  query?: Record<string, string | number | undefined | null>,
): Promise<
  | { ok: true; filename: string }
  | { ok: false; reason: TeachingDownloadFailReason; message?: string; code?: string }
> {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!isAllowedTeachingDownloadPath(clean)) {
    return { ok: false, reason: 'path_not_allowed' };
  }

  const qs = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === '') continue;
      qs.set(key, String(value));
    }
  }
  const url = `${PROXY_BASE}${clean}${qs.toString() ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf, application/zip, text/csv, application/json, */*',
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const disposition = res.headers.get('content-disposition');
    const isFile =
      res.ok &&
      (isFileContentType(contentType) ||
        disposition?.toLowerCase().includes('attachment'));

    if (isFile) {
      const blob = await res.blob();
      const filename = filenameFromDisposition(disposition, fallbackFilename);
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return { ok: true, filename };
    }

    if (!res.ok) {
      return { ok: false, ...(await readJsonError(res)) };
    }

    if (contentType.includes('application/json')) {
      return { ok: false, ...(await readJsonError(res)) };
    }

    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
