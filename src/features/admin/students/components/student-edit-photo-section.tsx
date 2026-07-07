'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { formatDocumentFileSize } from '../utils/student-document-display';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';
import { useStudentDocuments } from '../hooks/use-student-documents';
import { useStudentOptions } from '../hooks/use-student-options';
import { StudentPhotoVisual } from './student-photo-visual';
import {
  studentPhotoUploadErrorKey,
  uploadStudentPhotoDocument,
  validateStudentPhotoFile,
} from '../utils/student-photo-upload';
import type { Gender } from '@/types/student';

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

function fileTypeLabel(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '—';
}

export function StudentEditPhotoSection({
  studentId,
  gender,
  displayName,
  imageUrl,
  thumbnailUrl,
  canManage,
  onUploaded,
}: {
  studentId: number;
  gender: Gender | null;
  displayName: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  canManage: boolean;
  onUploaded: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const docsState = useStudentDocuments(studentId, true);
  const optionsState = useStudentOptions();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState<number | null>(null);

  const documents = docsState.data?.items ?? [];
  const documentTypes = optionsState.options?.documentTypes ?? [];
  const busy = uploadState === 'uploading' || docsState.loading;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#student-photo') return;
    const section = document.getElementById('student-photo');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const focusTarget = section?.querySelector<HTMLElement>('[data-photo-focus]');
    focusTarget?.focus({ preventScroll: true });
  }, [studentId]);

  const currentPreview = useMemo(() => {
    if (uploadState === 'selected' && previewUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={t('admin.student360.editPage.photo.previewAlt')} className="student-edit-photo__img" />
      );
    }
    return (
      <StudentPhotoVisual
        gender={gender}
        imageUrl={imageUrl}
        thumbnailUrl={thumbnailUrl}
        displayName={displayName}
        className={`student-edit-photo__frame${imageUrl || thumbnailUrl ? ' student-edit-photo__frame--photo' : ''}`}
        imageClassName="student-edit-photo__img"
        placeholderClassName="student-edit-photo__placeholder-img"
        cacheBust={cacheBust}
        photoAlt={t('admin.student360.editPage.photo.currentAlt', { name: displayName })}
        placeholderAriaLabel={t('admin.student360.editPage.photo.placeholderAria')}
      />
    );
  }, [
    uploadState,
    previewUrl,
    gender,
    imageUrl,
    thumbnailUrl,
    displayName,
    cacheBust,
    t,
  ]);

  function resetSelection() {
    setFile(null);
    setErrorMessage(null);
    setUploadState('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleFileChange(next: File | null) {
    setErrorMessage(null);
    if (!next) {
      resetSelection();
      return;
    }
    const validation = validateStudentPhotoFile(next);
    if (!validation.ok) {
      setErrorMessage(
        t(
          `admin.student360.editPage.photo.errors.${studentPhotoUploadErrorKey(validation.reason!)}`,
        ),
      );
      resetSelection();
      return;
    }
    setFile(next);
    setUploadState('selected');
  }

  async function handleUpload() {
    if (!file || !canManage || uploadState === 'uploading') return;
    setUploadState('uploading');
    setErrorMessage(null);

    const res = await uploadStudentPhotoDocument({
      studentId,
      file,
      documents,
      documentTypes,
      activeSchoolId,
    });

    if (res.success) {
      setCacheBust(Date.now());
      setUploadState('success');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      docsState.reload();
      onUploaded();
      toast.success(t('admin.student360.editPage.photo.uploadSuccess'));
      window.setTimeout(() => setUploadState('idle'), 1200);
      return;
    }

    const mapped = mapStudentDocumentApiError(res.error, t);
    setUploadState('error');
    setErrorMessage(mapped.file ?? mapped.general ?? t('admin.student360.editPage.photo.uploadFailed'));
  }

  return (
    <section id="student-photo" className="student-edit-photo-section card" aria-labelledby={`${inputId}-title`}>
      <SectionHead title={t('admin.student360.editPage.photo.title')} />
      <p className="tiny muted">{t('admin.student360.editPage.photo.description')}</p>

      <div className="student-edit-photo-section__preview">{currentPreview}</div>

      {canManage ? (
        <div className="student-edit-photo-section__controls">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="student-edit-photo-section__input"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={busy}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="student-edit-photo-section__selected">
              <div className="student-edit-photo-section__meta">
                <span className="student-edit-photo-section__filename" dir="ltr">
                  {file.name}
                </span>
                <span className="tiny muted">
                  {formatDocumentFileSize(file.size)} · <span dir="ltr">{fileTypeLabel(file)}</span>
                </span>
              </div>
              <div className="student-edit-photo-section__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={busy}
                  onClick={resetSelection}
                >
                  {t('admin.student360.editPage.photo.clearSelection')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busy}
                  onClick={handleUpload}
                >
                  {uploadState === 'uploading'
                    ? t('admin.student360.editPage.photo.uploading')
                    : t('admin.student360.editPage.photo.upload')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-photo-focus
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {imageUrl || thumbnailUrl
                ? t('admin.student360.editPage.photo.changePhoto')
                : t('admin.student360.editPage.photo.choosePhoto')}
            </button>
          )}

          <p className="tiny muted">{t('admin.student360.editPage.photo.limits')}</p>

          {uploadState === 'success' ? (
            <p className="student-edit-photo-section__success" role="status">
              {t('admin.student360.editPage.photo.uploadSuccess')}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="field-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="tiny muted">{t('admin.student360.editPage.photo.readOnlyHint')}</p>
      )}
    </section>
  );
}
