'use client';

import { useEffect, useState } from 'react';
import {
  fetchAttachmentPreviewText,
  downloadAttachment,
} from '@/lib/api/attachments';
import {
  isTextAttachment,
  resolveSecureAttachmentUrl,
} from '@/lib/attachments/secure-url';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentMeta } from '@/types/attachment';

interface AttachmentPreviewModalProps {
  attachment: AttachmentMeta | null;
  open: boolean;
  onClose: () => void;
}

export function AttachmentPreviewModal({
  attachment,
  open,
  onClose,
}: AttachmentPreviewModalProps) {
  const t = useT();
  const toast = useToast();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const previewUrl = attachment
    ? resolveSecureAttachmentUrl(attachment.preview_url, 'preview', attachment.id)
    : null;

  useEffect(() => {
    if (!open || !attachment) {
      setTextContent(null);
      return;
    }

    if (!isTextAttachment(attachment)) return;

    let cancelled = false;
    setLoadingText(true);
    fetchAttachmentPreviewText(attachment.id).then((text) => {
      if (cancelled) return;
      setTextContent(text);
      setLoadingText(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, attachment]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !attachment) return null;

  const isImage = attachment.is_image === true;
  const isPdf = attachment.is_pdf === true;
  const isText = isTextAttachment(attachment);
  const canInlinePreview =
    attachment.is_previewable !== false &&
    previewUrl &&
    (isImage || isPdf || (isText && textContent !== null));

  async function handleDownload() {
    setDownloading(true);
    const result = await downloadAttachment(attachment!.id, attachment!.name);
    setDownloading(false);
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
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('attachments.preview')}
      onClick={onClose}
    >
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content__header between">
          <strong className="attachment-list__name">{attachment.name}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content__body">
          {canInlinePreview && isImage && (
            <img
              src={previewUrl!}
              alt={attachment.name}
              className="attachment-preview-image"
            />
          )}

          {canInlinePreview && isPdf && (
            <iframe
              src={previewUrl!}
              title={attachment.name}
              className="attachment-preview-frame"
            />
          )}

          {isText && loadingText && <p className="muted">{t('common.loading')}</p>}

          {canInlinePreview && isText && textContent !== null && (
            <pre className="attachment-preview-text">{textContent}</pre>
          )}

          {!canInlinePreview && (
            <div className="attachment-preview-fallback col" style={{ gap: 12 }}>
              <p className="muted">{t('attachments.previewUnavailable')}</p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={downloading}
                onClick={handleDownload}
              >
                {downloading ? t('common.downloading') : t('attachments.download')}
              </button>
            </div>
          )}
        </div>

        {canInlinePreview && (
          <div className="modal-content__footer row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? t('common.downloading') : t('attachments.download')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
