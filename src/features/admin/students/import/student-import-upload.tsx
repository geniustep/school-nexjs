'use client';

import { useRef } from 'react';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  STUDENT_IMPORT_ACCEPTED_EXTENSION,
  STUDENT_IMPORT_MAX_FILE_BYTES,
} from './student-import-constants';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentImportUpload({
  file,
  error,
  parsing,
  onFileSelected,
  onClear,
}: {
  file: File | null;
  error: string | null;
  parsing: boolean;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    const next = list?.[0];
    if (!next) return;
    onFileSelected(next);
  }

  return (
    <Card>
      <SectionHead title={t('admin.studentImport.upload.title')} />
      <p className="tiny muted">{t('admin.studentImport.upload.hint')}</p>

      <div
        className="student-import-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={STUDENT_IMPORT_ACCEPTED_EXTENSION}
          className="student-import-dropzone__input"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p>{t('admin.studentImport.upload.dropHere')}</p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={parsing}
          onClick={() => inputRef.current?.click()}
        >
          {t('admin.studentImport.upload.chooseFile')}
        </button>
        <p className="tiny muted">
          {t('admin.studentImport.upload.limits', {
            ext: STUDENT_IMPORT_ACCEPTED_EXTENSION,
            size: formatBytes(STUDENT_IMPORT_MAX_FILE_BYTES),
          })}
        </p>
      </div>

      {file ? (
        <div className="student-import-file-card">
          <div className="student-import-file-card__meta">
            <strong className="student-import-file-card__name">{file.name}</strong>
            <span className="tiny muted">{formatBytes(file.size)}</span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" disabled={parsing} onClick={onClear}>
            {t('admin.studentImport.upload.remove')}
          </button>
        </div>
      ) : null}

      {parsing ? <p className="tiny muted">{t('admin.studentImport.validating')}</p> : null}
      {error ? (
        <p className="tiny" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </Card>
  );
}

export function validateStudentImportFile(file: File, t: (key: string) => string): string | null {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(STUDENT_IMPORT_ACCEPTED_EXTENSION)) {
    return t('admin.studentImport.errors.unsupportedExtension');
  }
  if (file.size > STUDENT_IMPORT_MAX_FILE_BYTES) {
    return t('admin.studentImport.errors.fileTooLarge');
  }
  const mime = file.type;
  if (
    mime &&
    mime !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
    mime !== 'application/octet-stream'
  ) {
    return t('admin.studentImport.errors.unsupportedMime');
  }
  return null;
}
