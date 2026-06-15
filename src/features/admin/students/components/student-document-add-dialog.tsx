'use client';

import { useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentDocumentTypeOption } from '@/types/student-360';
import {
  buildStudentDocumentCreateFormData,
  studentDocumentUploadErrorKey,
  validateDocumentDates,
  validateStudentDocumentFile,
} from '../utils/student-document-upload-policy';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';
import { StudentDocumentFileUpload } from './student-document-file-upload';

export function StudentDocumentAddDialog({
  open,
  studentId,
  documentTypes,
  initialDocumentTypeId,
  onClose,
  onCreated,
}: {
  open: boolean;
  studentId: number;
  documentTypes: StudentDocumentTypeOption[];
  initialDocumentTypeId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && initialDocumentTypeId) {
      setDocumentTypeId(initialDocumentTypeId);
    }
  }, [open, initialDocumentTypeId]);

  function reset() {
    setDocumentTypeId('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
    setNotes('');
    setFile(null);
    setErrors({});
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function handleFileChange(next: File | null) {
    setFile(next);
    if (!next) {
      setErrors((e) => ({ ...e, file: '' }));
      return;
    }
    const fileValidation = validateStudentDocumentFile(next);
    if (!fileValidation.ok) {
      setErrors((e) => ({
        ...e,
        file: t(
          `admin.student360.documents.errors.${studentDocumentUploadErrorKey(fileValidation.reason!)}`,
        ),
      }));
      setFile(null);
      return;
    }
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
      nextErrors.file = t(
        `admin.student360.documents.errors.${studentDocumentUploadErrorKey(fileValidation.reason!)}`,
      );
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

  const titleId = 'student-doc-add-title';
  const descId = 'student-doc-add-desc';

  return (
    <SetupDrawer open={open} title={t('admin.student360.documents.addDocument')} onClose={handleClose}>
      <form
        className="student-360-drawer-form student-doc-form form form--stacked"
        onSubmit={handleSubmit}
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <p id={descId} className="visually-hidden">
          {t('admin.student360.documents.pageDescription')}
        </p>
        {errors.general ? (
          <p className="form-error" role="alert">
            {errors.general}
          </p>
        ) : null}

        <fieldset className="student-doc-form__section">
          <legend>{t('admin.student360.documents.formSectionIdentity')}</legend>
          <label className="form-field">
            <span>
              {t('admin.student360.documents.documentType')} <span aria-hidden="true">*</span>
            </span>
            <select
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!errors.documentType}
            >
              <option value="">{t('common.dash')}</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                  {dt.is_required ? ' *' : ''}
                </option>
              ))}
            </select>
            {errors.documentType ? (
              <span className="field-error" role="alert">
                {errors.documentType}
              </span>
            ) : null}
          </label>

          <label className="form-field">
            <span>{t('admin.student360.documents.documentNumber')}</span>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset className="student-doc-form__section">
          <legend>{t('admin.student360.documents.formSectionDates')}</legend>
          <div className="form-row form-row--2">
            <label className="form-field">
              <span>{t('admin.student360.documents.issueDate')}</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{t('admin.student360.documents.expiryDate')}</span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              {errors.expiryDate ? (
                <span className="field-error" role="alert">
                  {errors.expiryDate}
                </span>
              ) : null}
            </label>
          </div>
        </fieldset>

        <fieldset className="student-doc-form__section">
          <legend>{t('admin.student360.documents.formSectionNotes')}</legend>
          <label className="form-field">
            <span>{t('admin.student360.documents.notes')}</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="student-doc-form__section">
          <legend>
            {t('admin.student360.documents.formSectionFile')} <span aria-hidden="true">*</span>
          </legend>
          <StudentDocumentFileUpload
            file={file}
            error={errors.file}
            disabled={submitting}
            onChange={handleFileChange}
          />
        </fieldset>

        <div className="student-doc-form__footer form-actions">
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
