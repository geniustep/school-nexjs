'use client';

import { useState } from 'react';
import { downloadAttachment } from '@/lib/api/attachments';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentMeta } from '@/types/attachment';

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function AttachmentList({ attachments }: { attachments: AttachmentMeta[] }) {
  const toast = useToast();
  const t = useT();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (!attachments?.length) return null;

  async function handleDownload(att: AttachmentMeta) {
    setLoadingId(att.id);
    const result = await downloadAttachment(att.id, att.name);
    setLoadingId(null);
    if (result.ok) {
      toast.success(t('academic.downloadStarted'));
    } else {
      const msg = result.message?.startsWith('errors.')
        ? t(result.message)
        : (result.message ?? t('errors.attachmentFailed'));
      toast.error(msg);
    }
  }

  return (
    <ul className="attachment-list">
      {attachments.map((att) => (
        <li key={att.id} className="attachment-list__item">
          <div className="attachment-list__meta">
            <span className="attachment-list__name">{att.name}</span>
            {att.size != null && att.size > 0 && (
              <span className="tiny muted">{formatSize(att.size)}</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={loadingId === att.id}
            onClick={() => handleDownload(att)}
          >
            {loadingId === att.id ? t('common.downloading') : t('common.download')}
          </button>
        </li>
      ))}
    </ul>
  );
}
