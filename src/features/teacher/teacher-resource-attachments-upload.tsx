'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  RESOURCE_ATTACHMENT_MAX_FILES,
  buildResourceAttachmentsFormData,
  validateResourceUploadFiles,
  type ResourceUploadRejectReason,
} from '@/lib/attachments/resource-upload';
import type { ResourceAttachmentsUploadData } from '@/types/attachment';

interface TeacherResourceAttachmentsUploadProps {
  resourceId: number;
  existingCount: number;
  onUploaded: () => void;
}

function rejectMessage(t: (k: string) => string, reason: ResourceUploadRejectReason): string {
  switch (reason) {
    case 'unsupported_file_type':
      return t('teacher.fileTypeNotAllowed');
    case 'file_too_large':
      return t('teacher.fileTooLarge');
    case 'too_many_files':
      return t('teacher.tooManyAttachments');
    case 'pick_at_least_one':
      return t('teacher.pickAtLeastOneFile');
    default:
      return t('errors.validationFailed');
  }
}

function mapApiError(t: (k: string) => string, code: string, message: string): string {
  switch (code) {
    case 'unsupported_file_type':
      return t('teacher.fileTypeNotAllowed');
    case 'file_too_large':
      return t('teacher.fileTooLarge');
    case 'too_many_files':
      return t('teacher.tooManyAttachments');
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

export function TeacherResourceAttachmentsUpload({
  resourceId,
  existingCount,
  onUploaded,
}: TeacherResourceAttachmentsUploadProps) {
  const t = useT();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const slotsLeft = RESOURCE_ATTACHMENT_MAX_FILES - existingCount;
  const canAddMore = slotsLeft > 0;

  function handlePickClick() {
    if (!canAddMore) {
      toast.error(t('teacher.tooManyAttachments'));
      return;
    }
    setOpen(true);
    inputRef.current?.click();
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    const validation = validateResourceUploadFiles(picked, existingCount);
    if (!validation.ok && validation.reason) {
      toast.error(rejectMessage(t, validation.reason));
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
    const validation = validateResourceUploadFiles(pending, existingCount);
    if (!validation.ok && validation.reason) {
      toast.error(rejectMessage(t, validation.reason));
      return;
    }

    setUploading(true);
    const res = await api.uploadForm<ResourceAttachmentsUploadData>(
      endpoints.teacher.resourceAttachments(resourceId),
      buildResourceAttachmentsFormData(pending),
    );
    setUploading(false);

    if (res.success) {
      toast.success(t('teacher.resourceAttachmentsUploadSuccess'));
      setPending([]);
      setOpen(false);
      onUploaded();
    } else {
      toast.error(mapApiError(t, res.error.code, res.error.message));
    }
  }

  if (!canAddMore) {
    return (
      <p className="tiny muted mt-2">{t('teacher.tooManyAttachments')}</p>
    );
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
          {t('teacher.addAttachments')}
        </button>
      )}

      {open && (
        <div className="col" style={{ gap: 8 }}>
          {pending.length === 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={handlePickClick}>
              {t('teacher.addAttachments')}
            </button>
          ) : (
            <>
              <ul className="attachment-list">
                {pending.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="attachment-list__item">
                    <span className="attachment-list__name">{file.name}</span>
                    <span className="tiny muted">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
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
                  {uploading ? t('common.saving') : t('teacher.uploadAttachments')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={uploading}
                  onClick={handlePickClick}
                >
                  {t('teacher.addAttachments')}
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
