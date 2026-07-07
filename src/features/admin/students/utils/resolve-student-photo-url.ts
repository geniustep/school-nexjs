import {
  resolveSecureAttachmentUrl,
  type AttachmentBinaryAction,
} from '@/lib/attachments/secure-url';

const ODOO_WEB_BFF = '/api/odoo-web';
const ATTACHMENT_PATH_RE = /\/attachments\/(\d+)(?:\/(download|preview|thumbnail))?/;

/** Map attachment preview/thumbnail paths to same-origin `/api/attachments/{id}/{action}`. */
function resolveStudentPhotoAttachmentBffUrl(url: string): string | null {
  const match = url.match(ATTACHMENT_PATH_RE);
  if (!match) return null;
  const action = (match[2] as AttachmentBinaryAction | undefined) ?? 'preview';
  return resolveSecureAttachmentUrl(url, action, Number(match[1]));
}

/** Map API-returned student photo paths to same-origin BFF routes. */
export function resolveStudentPhotoUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  const attachmentBff = resolveStudentPhotoAttachmentBffUrl(trimmed);
  if (attachmentBff) return attachmentBff;

  if (trimmed.startsWith(`${ODOO_WEB_BFF}/`)) return trimmed;
  if (trimmed.startsWith('/api/attachments/')) return trimmed;
  if (trimmed.startsWith('/api/odoo/')) return trimmed;
  if (trimmed.startsWith('/api/')) return trimmed;

  if (trimmed.startsWith('/web/')) {
    return `${ODOO_WEB_BFF}/${trimmed.slice('/web/'.length)}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/web/')) {
        return `${ODOO_WEB_BFF}/${parsed.pathname.slice('/web/'.length)}${parsed.search}`;
      }
      const apiMatch = parsed.pathname.match(/^\/api\/v1(\/.+)$/);
      if (apiMatch && !apiMatch[1].startsWith('/attachments/')) {
        return `/api/odoo${apiMatch[1]}${parsed.search}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  if (trimmed.startsWith('/admin/')) return `/api/odoo${trimmed}`;

  // Reject bare tokens such as image_128 — not a fetchable URL.
  if (!trimmed.startsWith('/')) return null;

  return null;
}

/** Ordered same-origin candidates: full image, thumbnail, legacy fallback. */
export function resolveStudentPhotoCandidates(
  photo?: { thumbnail_url?: string | null; image_url?: string | null } | null,
  legacyImageUrl?: string | null,
): string[] {
  const raw = [photo?.image_url, photo?.thumbnail_url, legacyImageUrl];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    const resolved = resolveStudentPhotoUrl(item);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      out.push(resolved);
    }
  }

  return out;
}
