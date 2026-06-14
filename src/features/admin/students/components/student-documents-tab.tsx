'use client';

import { useRef, useState } from 'react';
import { AttachmentPreviewModal } from '@/components/attachments/attachment-preview-modal';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { downloadAttachment } from '@/lib/api/attachments';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AttachmentMeta } from '@/types/attachment';
import type { StudentDocument, StudentDocumentSummary, StudentRefOption } from '@/types/student-360';
import { useStudentDocuments } from '../hooks/use-student-documents';
import { useStudentOptions } from '../hooks/use-student-options';
import {
  documentAttachmentToMeta,
  documentStateBadgeClass,
  formatDocumentFileSize,
  isDocumentActive,
} from '../utils/student-document-display';
import { documentTypeLabel } from '../utils/normalize-student-documents';
import {
  buildStudentDocumentReplaceFormData,
  validateStudentDocumentFile,
} from '../utils/student-document-upload-policy';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';
import { StudentDocumentAddDialog } from './student-document-add-dialog';
import { StudentDocumentEditDialog } from './student-document-edit-dialog';

function SummaryCards({
  summary,
  t,
}: {
  summary: StudentDocumentSummary;
  t: (key: string) => string;
}) {
  const items = [
    { label: t('admin.student360.documents.summaryTotal'), value: summary.total },
    { label: t('admin.student360.documents.summaryValid'), value: summary.valid },
    { label: t('admin.student360.documents.summaryExpired'), value: summary.expired },
    {
      label: t('admin.student360.documents.summaryMissing'),
      value: summary.missing_required,
    },
  ];
  return (
    <div className="student-doc-summary-grid">
      {items.map((item) => (
        <Card key={item.label} className="student-doc-summary-card">
          <span className="student-doc-summary-value">{item.value}</span>
          <span className="tiny muted">{item.label}</span>
        </Card>
      ))}
    </div>
  );
}

function documentStateLabel(
  state: string,
  states: StudentRefOption[],
  t: (key: string) => string,
): string {
  return states.find((s) => s.value === state)?.label ?? t(`admin.student360.documents.states.${state}`);
}

export function StudentDocumentsTab({
  studentId,
  canManage,
  onChanged,
}: {
  studentId: number;
  canManage: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const docsState = useStudentDocuments(studentId, true);
  const optionsState = useStudentOptions();
  const [addOpen, setAddOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<StudentDocument | null>(null);
  const [previewMeta, setPreviewMeta] = useState<AttachmentMeta | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingDocId, setReplacingDocId] = useState<number | null>(null);

  const documentTypes = optionsState.options?.documentTypes ?? [];
  const documentStates = optionsState.options?.documentStates ?? [];

  function handleChanged() {
    docsState.reload();
    onChanged();
  }

  async function handleArchive(doc: StudentDocument) {
    if (
      !window.confirm(t('admin.student360.documents.archiveConfirm'))
    ) {
      return;
    }
    setBusyId(doc.id);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.post<unknown>(
      endpoints.admin.studentDocumentArchive(studentId, doc.id),
      {},
      query,
    );
    setBusyId(null);
    if (res.success) {
      toast.success(t('admin.student360.documents.archiveSuccess'));
      handleChanged();
    } else {
      const mapped = mapStudentDocumentApiError(res.error, t);
      toast.error(mapped.general ?? t('errors.generic'));
    }
  }

  async function handleDownload(doc: StudentDocument) {
    if (!doc.attachment) return;
    setBusyId(doc.id);
    const result = await downloadAttachment(doc.attachment.id, doc.attachment.name);
    setBusyId(null);
    if (result.ok) {
      toast.success(t('academic.downloadStarted'));
    } else {
      toast.error(t(result.message ?? 'errors.attachmentFailed'));
    }
  }

  function startReplace(doc: StudentDocument) {
    setReplacingDocId(doc.id);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(file: File | null) {
    const docId = replacingDocId;
    setReplacingDocId(null);
    if (!docId || !file) return;

    const validation = validateStudentDocumentFile(file);
    if (!validation.ok) {
      toast.error(t(`admin.student360.documents.errors.${validation.reason}`));
      return;
    }

    setBusyId(docId);
    const query =
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    const res = await api.uploadForm<unknown>(
      endpoints.admin.studentDocumentReplace(studentId, docId),
      buildStudentDocumentReplaceFormData(file),
      query,
    );
    setBusyId(null);
    if (res.success) {
      toast.success(t('admin.student360.documents.replaceSuccess'));
      handleChanged();
    } else {
      const mapped = mapStudentDocumentApiError(res.error, t);
      toast.error(mapped.file ?? mapped.general ?? t('errors.generic'));
    }
  }

  if (docsState.loading && !docsState.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (docsState.error) {
    return <ApiErrorView error={docsState.error} onRetry={docsState.reload} />;
  }

  const data = docsState.data!;
  const activeItems = data.items.filter(isDocumentActive);

  return (
    <div className="student-doc-tab">
      <SectionHead
        title={t('admin.student360.documents.title')}
        action={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
              {t('admin.student360.documents.addDocument')}
            </button>
          ) : null
        }
      />

      <SummaryCards summary={data.summary} t={t} />

      {activeItems.length === 0 ? (
        <Card>
          <p className="tiny muted">{t('admin.student360.documents.empty')}</p>
        </Card>
      ) : (
        <div className="student-doc-list">
          {activeItems.map((doc) => (
            <Card key={doc.id} className="student-doc-item">
              <div className="student-doc-item__head">
                <div>
                  <strong>{documentTypeLabel(doc.document_type)}</strong>
                  <span className={documentStateBadgeClass(doc.state)}>
                    {documentStateLabel(doc.state, documentStates, t)}
                  </span>
                </div>
                <div className="student-doc-item__actions">
                  {doc.attachment ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busyId === doc.id}
                        onClick={() => setPreviewMeta(documentAttachmentToMeta(doc.attachment!))}
                      >
                        {t('admin.student360.documents.preview')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busyId === doc.id}
                        onClick={() => handleDownload(doc)}
                      >
                        {t('admin.student360.documents.download')}
                      </button>
                    </>
                  ) : null}
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busyId === doc.id}
                        onClick={() => setEditDoc(doc)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busyId === doc.id}
                        onClick={() => startReplace(doc)}
                      >
                        {t('admin.student360.documents.replaceFile')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={busyId === doc.id}
                        onClick={() => handleArchive(doc)}
                      >
                        {t('admin.student360.documents.archive')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <dl className="student-doc-item__meta">
                <div>
                  <dt>{t('admin.student360.documents.documentNumber')}</dt>
                  <dd>{doc.document_number || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.documents.issueDate')}</dt>
                  <dd>{formatDate(doc.issue_date) || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.documents.expiryDate')}</dt>
                  <dd>{formatDate(doc.expiry_date) || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.documents.file')}</dt>
                  <dd>
                    {doc.attachment
                      ? `${doc.attachment.name} (${formatDocumentFileSize(doc.attachment.size)})`
                      : t('common.dash')}
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.student360.updatedAt')}</dt>
                  <dd>{formatDate(doc.write_date) || t('common.dash')}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          handleReplaceFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />

      <StudentDocumentAddDialog
        open={addOpen}
        studentId={studentId}
        documentTypes={documentTypes}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          toast.success(t('admin.student360.documents.createSuccess'));
          handleChanged();
        }}
      />

      <StudentDocumentEditDialog
        open={!!editDoc}
        studentId={studentId}
        document={editDoc}
        documentTypes={documentTypes}
        documentStates={documentStates}
        onClose={() => setEditDoc(null)}
        onUpdated={() => {
          toast.success(t('admin.student360.documents.updateSuccess'));
          handleChanged();
        }}
      />

      <AttachmentPreviewModal
        attachment={previewMeta}
        open={!!previewMeta}
        onClose={() => setPreviewMeta(null)}
      />
    </div>
  );
}
