export type AttachmentBinaryAction = 'download' | 'preview' | 'thumbnail';

const ATTACHMENT_PATH_RE =
  /\/attachments\/(\d+)(?:\/(download|preview|thumbnail))?/;

/** Map API-returned paths/URLs to same-origin BFF routes. Blocks raw Odoo URLs. */
export function resolveSecureAttachmentUrl(
  urlOrPath: string | null | undefined,
  action: AttachmentBinaryAction,
  attachmentId?: number,
): string | null {
  if (attachmentId != null && Number.isFinite(attachmentId)) {
    return `/api/attachments/${attachmentId}/${action}`;
  }
  if (!urlOrPath) return null;

  const match = urlOrPath.match(ATTACHMENT_PATH_RE);
  if (match) {
    return `/api/attachments/${match[1]}/${action}`;
  }

  return null;
}

export function hasListAttachments(item: {
  has_attachments?: boolean;
  attachment_count?: number;
}): boolean {
  if (item.has_attachments === true) return true;
  return (item.attachment_count ?? 0) > 0;
}

/** Allow only http(s) links — block javascript:, data:, etc. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Embed URLs must be https from known video providers. */
export function isSafeEmbedUrl(url: string): boolean {
  if (!isSafeHttpUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.replace(/^www\./, '');
    return (
      host === 'youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'youtu.be' ||
      host === 'player.vimeo.com' ||
      host === 'vimeo.com'
    );
  } catch {
    return false;
  }
}

export function attachmentTypeIcon(mimetype?: string | null, name?: string): string {
  const mt = (mimetype ?? '').toLowerCase();
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  if (mt.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return '🖼️';
  }
  if (mt === 'application/pdf' || ext === 'pdf') return '📄';
  if (mt.startsWith('text/') || ext === 'txt') return '📝';
  if (mt.includes('word') || ['doc', 'docx'].includes(ext)) return '📃';
  if (mt.includes('sheet') || mt.includes('excel') || ['xls', 'xlsx'].includes(ext)) {
    return '📊';
  }
  if (mt.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return '📽️';
  return '📎';
}

export function isTextAttachment(att: { mimetype?: string | null; name: string }): boolean {
  const mt = (att.mimetype ?? '').toLowerCase();
  if (mt.startsWith('text/')) return true;
  return att.name.toLowerCase().endsWith('.txt');
}
