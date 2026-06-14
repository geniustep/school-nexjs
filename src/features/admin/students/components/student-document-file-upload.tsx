'use client';

import { useId, useRef } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { formatDocumentFileSize } from '../utils/student-document-display';
import { validateStudentDocumentFile } from '../utils/student-document-upload-policy';

function fileTypeLabel(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '—';
}

export function StudentDocumentFileUpload({
  file,
  error,
  disabled = false,
  onChange,
}: {
  file: File | null;
  error?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  const t = useT();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    if (!next) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const validation = validateStudentDocumentFile(next);
    if (!validation.ok) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(next);
  }

  return (
    <div className="student-doc-file-upload">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="student-doc-file-upload__input"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="student-doc-file-upload__selected">
          <div className="student-doc-file-upload__meta">
            <span className="student-doc-file-upload__name" dir="ltr">
              {file.name}
            </span>
            <span className="student-doc-file-upload__details">
              {formatDocumentFileSize(file.size)} ·{' '}
              <span dir="ltr">{fileTypeLabel(file)}</span>
            </span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={disabled}
            onClick={() => pickFile(null)}
          >
            {t('common.clear')}
          </button>
        </div>
      ) : (
        <div
          className="student-doc-file-upload__drop"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={`${inputId}-hint`}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled) return;
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <p id={`${inputId}-label`} className="student-doc-file-upload__prompt">
            {t('admin.student360.documents.fileUploadPrompt')}
          </p>
          <p id={`${inputId}-hint`} className="student-doc-file-upload__hint">
            {t('admin.student360.documents.fileUploadHint')}
          </p>
        </div>
      )}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
