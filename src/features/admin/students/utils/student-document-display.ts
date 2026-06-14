import type { AttachmentMeta } from '@/types/attachment';
import type { StudentDocument, StudentDocumentAttachment } from '@/types/student-360';

export function formatDocumentFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentAttachmentToMeta(
  attachment: StudentDocumentAttachment,
): AttachmentMeta {
  const mt = (attachment.mimetype ?? '').toLowerCase();
  const name = attachment.name;
  const isImage =
    mt.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(name);
  const isPdf = mt === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  return {
    id: attachment.id,
    name,
    mimetype: attachment.mimetype,
    size: attachment.size,
    is_image: isImage,
    is_pdf: isPdf,
    is_previewable: isImage || isPdf,
  };
}

export function documentStateBadgeClass(state: string): string {
  switch (state) {
    case 'valid':
      return 'badge badge--success';
    case 'expired':
      return 'badge badge--danger';
    case 'under_review':
      return 'badge badge--warning';
    case 'rejected':
      return 'badge badge--danger';
    case 'archived':
      return 'badge badge--muted';
    default:
      return 'badge';
  }
}

export function isDocumentActive(doc: StudentDocument): boolean {
  return doc.active !== false && doc.state !== 'archived';
}
