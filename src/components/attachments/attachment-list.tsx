'use client';

import { useRef, useState } from 'react';
import {
  deleteAttachment,
  downloadAttachment,
  replaceAttachment,
  type AttachmentManageRole,
} from '@/lib/api/attachments';
import { validateSingleAttachmentFile } from '@/lib/attachments/upload-policy';
import { isTextAttachment } from '@/lib/attachments/secure-url';
import { AttachmentPreviewModal } from '@/components/attachments/attachment-preview-modal';
import { AttachmentThumbnail } from '@/components/attachments/attachment-thumbnail';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { AttachmentMeta } from '@/types/attachment';

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface AttachmentListProps {
  attachments: AttachmentMeta[];
  manageRole?: AttachmentManageRole | null;
  onChanged?: () => void;
}

export function AttachmentList({
  attachments,
  manageRole = null,
  onChanged,
}: AttachmentListProps) {
  const toast = useToast();
  const t = useT();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentMeta | null>(null);

  if (!attachments?.length) return null;

  const canManage = Boolean(manageRole);

  function mapErrorMessage(message?: string): string {
    if (message?.startsWith('errors.') || message?.startsWith('attachments.')) {
      return t(message);
    }
    return message ?? t('errors.attachmentFailed');
  }

  async function handleDownload(att: AttachmentMeta) {
    setLoadingId(att.id);
    const result = await downloadAttachment(att.id, att.name);
    setLoadingId(null);
    if (result.ok) {
      toast.success(t('academic.downloadStarted'));
    } else {
      toast.error(mapErrorMessage(result.message));
    }
  }

  async function handleDelete(att: AttachmentMeta) {
    if (!manageRole) return;
    if (!window.confirm(t('attachments.confirmDelete'))) return;

    setLoadingId(att.id);
    const result = await deleteAttachment(att.id, manageRole);
    setLoadingId(null);

    if (result.ok) {
      toast.success(t('attachments.deletedSuccess'));
      onChanged?.();
    } else {
      toast.error(mapErrorMessage(result.message));
    }
  }

  function startReplace(att: AttachmentMeta) {
    setReplacingId(att.id);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const attId = replacingId;
    setReplacingId(null);
    if (!file || attId == null || !manageRole) return;

    const validation = validateSingleAttachmentFile(file);
    if (!validation.ok && validation.reason) {
      const scope = manageRole;
      const key =
        validation.reason === 'unsupported_file_type'
          ? `${scope}.fileTypeNotAllowed`
          : validation.reason === 'file_too_large'
            ? `${scope}.fileTooLarge`
            : `${scope}.pickAtLeastOneFile`;
      toast.error(t(key));
      return;
    }

    setLoadingId(attId);
    const result = await replaceAttachment(attId, file, manageRole);
    setLoadingId(null);

    if (result.ok) {
      toast.success(t('attachments.replacedSuccess'));
      onChanged?.();
    } else {
      toast.error(mapErrorMessage(result.message));
    }
  }

  function canPreview(att: AttachmentMeta): boolean {
    if (att.is_previewable === false) return false;
    return att.is_image === true || att.is_pdf === true || isTextAttachment(att);
  }

  return (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
        onChange={handleReplaceFile}
      />

      <ul className="attachment-list">
        {attachments.map((att) => (
          <li key={att.id} className="attachment-list__item">
            <div className="attachment-list__leading">
              <AttachmentThumbnail attachment={att} size={36} />
              <div className="attachment-list__meta">
                <span className="attachment-list__name">{att.name}</span>
                {att.size != null && att.size > 0 && (
                  <span className="tiny muted">{formatSize(att.size)}</span>
                )}
              </div>
            </div>
            <div className="attachment-list__actions row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {canPreview(att) && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={loadingId === att.id}
                  onClick={() => setPreviewAttachment(att)}
                >
                  {t('attachments.preview')}
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={loadingId === att.id}
                onClick={() => handleDownload(att)}
              >
                {loadingId === att.id ? t('common.downloading') : t('attachments.download')}
              </button>
              {canManage && (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={loadingId === att.id}
                    onClick={() => startReplace(att)}
                  >
                    {t('attachments.replace')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={loadingId === att.id}
                    onClick={() => handleDelete(att)}
                  >
                    {t('attachments.delete')}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <AttachmentPreviewModal
        attachment={previewAttachment}
        open={previewAttachment != null}
        onClose={() => setPreviewAttachment(null)}
      />
    </>
  );
}
