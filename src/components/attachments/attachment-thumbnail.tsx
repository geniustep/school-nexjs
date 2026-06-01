'use client';

import { useState } from 'react';
import {
  attachmentTypeIcon,
  resolveSecureAttachmentUrl,
} from '@/lib/attachments/secure-url';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentMeta } from '@/types/attachment';

interface AttachmentThumbnailProps {
  attachment: Pick<AttachmentMeta, 'id' | 'name' | 'mimetype' | 'thumbnail_url' | 'is_image'>;
  size?: number;
  className?: string;
}

export function AttachmentThumbnail({
  attachment,
  size = 40,
  className,
}: AttachmentThumbnailProps) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const src =
    resolveSecureAttachmentUrl(attachment.thumbnail_url, 'thumbnail', attachment.id) ??
    (attachment.is_image
      ? resolveSecureAttachmentUrl(null, 'thumbnail', attachment.id)
      : null);

  const icon = attachmentTypeIcon(attachment.mimetype, attachment.name);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={t('attachments.thumbnailAlt')}
        className={className ?? 'attachment-thumb'}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={className ?? 'attachment-thumb attachment-thumb--icon'}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-hidden
    >
      {icon}
    </span>
  );
}
