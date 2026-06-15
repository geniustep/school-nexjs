'use client';

import { useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentDocument, StudentDocumentTypeOption, StudentRefOption } from '@/types/student-360';
import { validateDocumentDates } from '../utils/student-document-upload-policy';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';
import { documentTypeCode } from '../utils/normalize-student-documents';

export function StudentDocumentEditDialog({
  open,
  studentId,
  document,
  documentTypes,
  documentStates,
  onClose,
  onUpdated,
}: {
  open: boolean;
  studentId: number;
  document: StudentDocument | null;
  documentTypes: StudentDocumentTypeOption[];
  documentStates: StudentRefOption[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!document) return;
    const typeId =
      typeof document.document_type === 'object' && document.document_type
        ? String(document.document_type.id)
        : documentTypes.find((d) => d.code === documentTypeCode(document.document_type))?.id?.toString() ??
          '';
    setDocumentTypeId(typeId);
    setDocumentNumber(document.document_number ?? '');
    setIssueDate(document.issue_date ?? '');
    setExpiryDate(document.expiry_date ?? '');
    setNotes(document.notes ?? '');
    setState(document.state ?? '');
    setErrors({});
  }, [document, documentTypes]);

  if (!document) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const dateError = validateDocumentDates(issueDate, expiryDate);
    if (dateError) {
      nextErrors.expiryDate = t('admin.student360.documents.errors.invalidDates');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: Record<string, string | number> = {};
    const originalTypeId =
      typeof document!.document_type === 'object' && document!.document_type
        ? String(document!.document_type.id)
        : '';
    if (documentTypeId && documentTypeId !== originalTypeId) {
      payload.document_type_id = Number(documentTypeId);
    }
    if (documentNumber !== (document!.document_number ?? '')) {
      if (documentNumber.trim()) payload.document_number = documentNumber.trim();
    }
    if (issueDate !== (document!.issue_date ?? '')) {
      if (issueDate) payload.issue_date = issueDate;
    }
    if (expiryDate !== (document!.expiry_date ?? '')) {
      if (expiryDate) payload.expiry_date = expiryDate;
    }
    if (notes !== (document!.notes ?? '')) {
      if (notes.trim()) payload.notes = notes.trim();
    }
    if (state && state !== document!.state) {
      payload.state = state;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.post<unknown>(
      endpoints.admin.studentDocumentUpdate(studentId, document!.id),
      payload,
      query,
    );
    setSubmitting(false);

    if (res.success) {
      onUpdated();
      onClose();
      return;
    }

    const mapped = mapStudentDocumentApiError(res.error, t);
    setErrors({
      expiryDate: mapped.expiryDate ?? '',
      general: mapped.general ?? '',
    });
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.documents.editDocument')}
      onClose={() => !submitting && onClose()}
    >
      <form className="student-360-drawer-form form form--stacked" onSubmit={handleSubmit}>
        {errors.general ? <p className="form-error">{errors.general}</p> : null}

        <label className="form-field">
          <span>{t('admin.student360.documents.documentType')}</span>
          <select value={documentTypeId} onChange={(e) => setDocumentTypeId(e.target.value)}>
            <option value="">{t('common.dash')}</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
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

        {documentStates.length > 0 ? (
          <label className="form-field">
            <span>{t('admin.student360.documents.state')}</span>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {documentStates.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="form-field">
          <span>{t('admin.student360.documents.notes')}</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
