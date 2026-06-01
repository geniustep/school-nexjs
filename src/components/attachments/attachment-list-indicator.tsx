'use client';

import {
  attachmentTypeIcon,
  hasListAttachments,
  resolveSecureAttachmentUrl,
} from '@/lib/attachments/secure-url';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentListMeta } from '@/types/attachment';

interface AttachmentListIndicatorProps {
  item: AttachmentListMeta;
  /** Show truncated first attachment name (card lists). */
  showName?: boolean;
  /** Compact mode for table cells. */
  compact?: boolean;
}

export function AttachmentListIndicator({
  item,
  showName = true,
  compact = false,
}: AttachmentListIndicatorProps) {
  const t = useT();

  if (!hasListAttachments(item)) return null;

  const count = item.attachment_count ?? 0;
  const thumbSrc = resolveSecureAttachmentUrl(
    item.first_image_thumbnail_url,
    'thumbnail',
  );
  const icon = attachmentTypeIcon(item.first_attachment_mimetype, item.first_attachment_name ?? '');

  return (
    <div className={`attachment-indicator${compact ? ' attachment-indicator--compact' : ''}`}>
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          className="attachment-indicator__thumb"
          width={compact ? 28 : 36}
          height={compact ? 28 : 36}
          loading="lazy"
        />
      ) : (
        <span className="attachment-indicator__icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className="attachment-indicator__badge" title={t('attachments.hasAttachments')}>
        📎 {count > 0 ? count : ''}
      </span>
      {showName && item.first_attachment_name && (
        <span className="attachment-indicator__name tiny muted">{item.first_attachment_name}</span>
      )}
    </div>
  );
}
