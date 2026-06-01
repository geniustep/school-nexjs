'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import {
  ATTACHMENT_MAX_FILES,
  buildAttachmentsFormData,
  validateAttachmentUploadFiles,
  type AttachmentUploadRejectReason,
} from '@/lib/attachments/upload-policy';

type MessageScope = 'admin' | 'teacher';

interface AttachmentsUploadProps {
  uploadPath: string;
  existingCount: number;
  onUploaded: () => void;
  messageScope: MessageScope;
  /** Full i18n key for success toast; defaults to `{scope}.attachmentsUploadSuccess`. */
  successMessageKey?: string;
}

function rejectMessage(
  t: (k: string) => string,
  scope: MessageScope,
  reason: AttachmentUploadRejectReason,
): string {
  switch (reason) {
    case 'unsupported_file_type':
      return t(`${scope}.fileTypeNotAllowed`);
    case 'file_too_large':
      return t(`${scope}.fileTooLarge`);
    case 'too_many_files':
      return t(`${scope}.tooManyAttachments`);
    case 'pick_at_least_one':
      return t(`${scope}.pickAtLeastOneFile`);
    default:
      return t('errors.validationFailed');
  }
}

function mapApiError(
  t: (k: string) => string,
  scope: MessageScope,
  code: string,
  message: string,
): string {
  switch (code) {
    case 'unsupported_file_type':
      return t(`${scope}.fileTypeNotAllowed`);
    case 'file_too_large':
      return t(`${scope}.fileTooLarge`);
    case 'too_many_files':
      return t(`${scope}.tooManyAttachments`);
    case 'validation_error':
      return message || t('errors.validationFailed');
    case 'permission_denied':
      return t('errors.forbidden');
    case 'not_found':
      return t('errors.notFoundTitle');
    case 'unauthenticated':
      return t('login.sessionExpired');
    default:
      return message || t('errors.serverErrorTitle');
  }
}

export function AttachmentsUpload({
  uploadPath,
  existingCount,
  onUploaded,
  messageScope,
  successMessageKey,
}: AttachmentsUploadProps) {
  const t = useT();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const slotsLeft = ATTACHMENT_MAX_FILES - existingCount;
  const canAddMore = slotsLeft > 0;
  const successKey = successMessageKey ?? `${messageScope}.attachmentsUploadSuccess`;

  function handlePickClick() {
    if (!canAddMore) {
      toast.error(t(`${messageScope}.tooManyAttachments`));
      return;
    }
    setOpen(true);
    inputRef.current?.click();
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    const validation = validateAttachmentUploadFiles(picked, existingCount);
    if (!validation.ok && validation.reason) {
      toast.error(rejectMessage(t, messageScope, validation.reason));
      return;
    }
    setPending(picked);
    setOpen(true);
  }

  function clearPending() {
    setPending([]);
    setOpen(false);
  }

  async function upload() {
    const validation = validateAttachmentUploadFiles(pending, existingCount);
    if (!validation.ok && validation.reason) {
      toast.error(rejectMessage(t, messageScope, validation.reason));
      return;
    }

    setUploading(true);
    const res = await api.uploadForm(uploadPath, buildAttachmentsFormData(pending));
    setUploading(false);

    if (res.success) {
      toast.success(t(successKey));
      setPending([]);
      setOpen(false);
      onUploaded();
    } else {
      toast.error(mapApiError(t, messageScope, res.error.code, res.error.message));
    }
  }

  if (!canAddMore) {
    return <p className="tiny muted mt-2">{t(`${messageScope}.tooManyAttachments`)}</p>;
  }

  return (
    <div className="mt-2 col" style={{ gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
        onChange={handleFilesChange}
      />

      {!open && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={handlePickClick}>
          {t(`${messageScope}.addAttachments`)}
        </button>
      )}

      {open && (
        <div className="col" style={{ gap: 8 }}>
          {pending.length === 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={handlePickClick}>
              {t(`${messageScope}.addAttachments`)}
            </button>
          ) : (
            <>
              <ul className="attachment-list">
                {pending.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="attachment-list__item">
                    <span className="attachment-list__name">{file.name}</span>
                    <span className="tiny muted">{(file.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={uploading}
                  onClick={upload}
                >
                  {uploading ? t('common.saving') : t(`${messageScope}.uploadAttachments`)}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={uploading}
                  onClick={handlePickClick}
                >
                  {t(`${messageScope}.addAttachments`)}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={uploading}
                  onClick={clearPending}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
