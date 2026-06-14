'use client';

import { useRef, useState } from 'react';
import { AttachmentPreviewModal } from '@/components/attachments/attachment-preview-modal';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { downloadAttachment } from '@/lib/api/attachments';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AttachmentMeta } from '@/types/attachment';
import type { StudentDocument, StudentRefOption } from '@/types/student-360';
import { useStudentDocuments } from '../hooks/use-student-documents';
import { useStudentOptions } from '../hooks/use-student-options';
import {
  documentAttachmentToMeta,
  documentStateBadgeClass,
  formatDocumentFileSize,
  isDocumentActive,
} from '../utils/student-document-display';
import {
  missingRequiredDocumentTypes,
} from '../utils/normalize-student-documents';
import { resolveDocumentTypeLabel } from '../utils/document-type-labels';
import {
  buildStudentDocumentReplaceFormData,
  studentDocumentUploadErrorKey,
  validateStudentDocumentFile,
} from '../utils/student-document-upload-policy';
import { mapStudentDocumentApiError } from '../utils/student-document-api-errors';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { Student360MetricGrid } from './student-360-metric-grid';
import { Student360SectionHeader } from './student-360-section-header';
import { StudentDocumentAddDialog } from './student-document-add-dialog';
import { StudentDocumentEditDialog } from './student-document-edit-dialog';

function displayValue(value: string | null | undefined, fallback: string): string {
  if (value == null || value === '') return fallback;
  return value;
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
  const [addTypeId, setAddTypeId] = useState<string | undefined>();
  const [editDoc, setEditDoc] = useState<StudentDocument | null>(null);
  const [previewMeta, setPreviewMeta] = useState<AttachmentMeta | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingDocId, setReplacingDocId] = useState<number | null>(null);

  const documentTypes = optionsState.options?.documentTypes ?? [];
  const documentStates = optionsState.options?.documentStates ?? [];
  const notRecorded = t('admin.student360.documents.notRecorded');

  function openAddDialog(typeId?: string) {
    setAddTypeId(typeId);
    setAddOpen(true);
  }

  function handleChanged() {
    docsState.reload();
    onChanged();
  }

  async function handleArchive(doc: StudentDocument) {
    if (!window.confirm(t('admin.student360.documents.archiveConfirm'))) {
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
      toast.error(
        t(
          `admin.student360.documents.errors.${studentDocumentUploadErrorKey(validation.reason!)}`,
        ),
      );
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

  if (docsState.error && !docsState.data) {
    return <ApiErrorView error={docsState.error} onRetry={docsState.reload} />;
  }

  if (!docsState.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  const data = docsState.data;
  const activeItems = data.items.filter(isDocumentActive);
  const missingTypes = missingRequiredDocumentTypes(documentTypes, data.items);
  const missingCount = data.summary.missing_required;

  return (
    <div className="student-doc-tab student-360-tab-panel">
      <Student360SectionHeader
        title={t('admin.student360.documents.title')}
        description={t('admin.student360.documents.pageDescription')}
        action={
          canManage ? (
            <button
              type="button"
              className={`btn btn--sm ${missingTypes.length > 0 ? 'btn--ghost' : 'btn--primary'}`}
              onClick={() => openAddDialog()}
            >
              {t('admin.student360.documents.addDocument')}
            </button>
          ) : null
        }
      />

      <Student360MetricGrid
        variant="docs"
        items={[
          { key: 'total', label: t('admin.student360.documents.summaryTotal'), value: data.summary.total },
          { key: 'valid', label: t('admin.student360.documents.summaryValid'), value: data.summary.valid, tone: 'green' },
          { key: 'expired', label: t('admin.student360.documents.summaryExpired'), value: data.summary.expired, tone: missingCount > 0 ? 'none' : 'amber' },
          {
            key: 'missing',
            label: t('admin.student360.documents.summaryMissing'),
            value: missingCount,
            tone: missingCount > 0 ? 'red' : 'none',
          },
        ]}
      />

      {missingTypes.length > 0 ? (
        <section className="student-360-section">
          <h3 className="student-360-section__title">
            {t('admin.student360.documents.missingRequiredSection')}
          </h3>
          <Card className="student-doc-missing-list">
            <ul className="student-doc-missing-list__items">
              {missingTypes.map((dt) => (
                <li key={dt.id} className="student-doc-missing-list__item">
                  <div>
                    <strong>{resolveDocumentTypeLabel(dt, t)}</strong>
                    <span className="tiny muted">
                      {dt.is_required
                        ? t('admin.student360.documents.required')
                        : t('admin.student360.documents.optional')}
                    </span>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => openAddDialog(String(dt.id))}
                    >
                      {t('admin.student360.documents.addDocument')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : missingCount > 0 ? (
        <section className="student-360-section">
          <Card className="student-doc-missing-count">
            <p className="tiny muted">
              {t('admin.student360.documents.missingRequiredCountOnly', { count: missingCount })}
            </p>
          </Card>
        </section>
      ) : null}

      <section className="student-360-section">
        {activeItems.length === 0 ? (
          <Student360CompactEmpty
            title={t('admin.student360.documents.emptyTitle')}
            description={t('admin.student360.documents.emptyDescription')}
            action={
              canManage ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openAddDialog()}>
                  {t('admin.student360.documents.addDocument')}
                </button>
              ) : null
            }
          />
        ) : (
          <div className="student-doc-list">
            {activeItems.map((doc) => (
              <Card key={doc.id} className="student-doc-item">
                <div className="student-doc-item__head">
                  <div>
                    <strong>{resolveDocumentTypeLabel(doc.document_type, t) || notRecorded}</strong>
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
                    <dd dir="ltr">{displayValue(doc.document_number, notRecorded)}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.documents.issueDate')}</dt>
                    <dd>{formatDate(doc.issue_date) || notRecorded}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.documents.expiryDate')}</dt>
                    <dd>{formatDate(doc.expiry_date) || notRecorded}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.documents.file')}</dt>
                    <dd dir="ltr">
                      {doc.attachment
                        ? `${doc.attachment.name} (${formatDocumentFileSize(doc.attachment.size)})`
                        : notRecorded}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )}
      </section>

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
        initialDocumentTypeId={addTypeId}
        onClose={() => {
          setAddOpen(false);
          setAddTypeId(undefined);
        }}
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
