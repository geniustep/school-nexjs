'use client';

import { useRef, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentDocumentTypeOption } from '@/types/student-360';
import {
  buildStudentDocumentCreateFormData,
  validateDocumentDates,
  validateStudentDocumentFile,
} from '../utils/student-document-upload-policy';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';

export function StudentDocumentAddDialog({
  open,
  studentId,
  documentTypes,
  onClose,
  onCreated,
}: {
  open: boolean;
  studentId: number;
  documentTypes: StudentDocumentTypeOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setDocumentTypeId('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
    setNotes('');
    setFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function handleFileChange(next: File | null) {
    setFile(next);
    setErrors((e) => ({ ...e, file: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!documentTypeId) {
      nextErrors.documentType = t('admin.student360.documents.errors.typeRequired');
    }
    const fileValidation = validateStudentDocumentFile(file);
    if (!fileValidation.ok) {
      nextErrors.file = t(`admin.student360.documents.errors.${fileValidation.reason}`);
    }
    const dateError = validateDocumentDates(issueDate, expiryDate);
    if (dateError) {
      nextErrors.expiryDate = t('admin.student360.documents.errors.invalidDates');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const selected = documentTypes.find((d) => String(d.id) === documentTypeId);
    const fd = buildStudentDocumentCreateFormData(
      {
        documentTypeId,
        documentTypeCode: selected?.code,
        documentNumber,
        issueDate,
        expiryDate,
        notes,
      },
      file!,
    );

    setSubmitting(true);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.uploadForm<unknown>(
      endpoints.admin.studentDocuments(studentId),
      fd,
      query,
    );
    setSubmitting(false);

    if (res.success) {
      reset();
      onCreated();
      onClose();
      return;
    }

    const mapped = mapStudentDocumentApiError(res.error, t);
    setErrors({
      documentType: mapped.documentType ?? '',
      documentNumber: mapped.documentNumber ?? '',
      issueDate: mapped.issueDate ?? '',
      expiryDate: mapped.expiryDate ?? '',
      file: mapped.file ?? '',
      general: mapped.general ?? '',
    });
  }

  return (
    <SetupDrawer open={open} title={t('admin.student360.documents.addDocument')} onClose={handleClose}>
      <form className="form form--stacked" onSubmit={handleSubmit}>
        {errors.general ? <p className="form-error">{errors.general}</p> : null}

        <label className="form-field">
          <span>{t('admin.student360.documents.documentType')}</span>
          <select
            value={documentTypeId}
            onChange={(e) => setDocumentTypeId(e.target.value)}
            required
          >
            <option value="">{t('common.dash')}</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
                {dt.is_required ? ` *` : ''}
              </option>
            ))}
          </select>
          {errors.documentType ? <span className="field-error">{errors.documentType}</span> : null}
        </label>

        <label className="form-field">
          <span>{t('admin.student360.documents.documentNumber')}</span>
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
        </label>

        <div className="form-row form-row--2">
          <label className="form-field">
            <span>{t('admin.student360.documents.issueDate')}</span>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>
          <label className="form-field">
            <span>{t('admin.student360.documents.expiryDate')}</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            {errors.expiryDate ? <span className="field-error">{errors.expiryDate}</span> : null}
          </label>
        </div>

        <label className="form-field">
          <span>{t('admin.student360.documents.notes')}</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="form-field">
          <span>{t('admin.student360.documents.file')}</span>
          <div
            className="student-doc-file-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0] ?? null;
              handleFileChange(dropped);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="student-doc-file-info">
                <span className="student-doc-file-name">{file.name}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleFileChange(null)}
                >
                  {t('common.clear')}
                </button>
              </div>
            ) : (
              <p className="tiny muted">{t('admin.student360.documents.fileHint')}</p>
            )}
          </div>
          {errors.file ? <span className="field-error">{errors.file}</span> : null}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('admin.student360.documents.upload')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
