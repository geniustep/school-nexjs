'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { ExamDetailPanel } from '@/features/academic/exam-detail-panel';
import { ExamForm } from '@/features/admin/exam-form';
import { ExamWorkflowActions } from '@/features/admin/admin-workflow-actions';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamDetail } from '@/types/exam';

export default function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(false);
  const state = useResource<ExamDetail>(isNew ? null : endpoints.admin.exam(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/exams" className="back-link">
          ‹ {t('academic.backToExams')}
        </Link>
        <PageHeader title={t('admin.addExam')} />
        <ExamForm
          onSaved={(examId) => router.push(`/admin/exams/${examId}`)}
          onCancel={() => router.push('/admin/exams')}
        />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/exams" className="back-link">
        ‹ {t('academic.backToExams')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(exam) => (
          <>
            <PageHeader
              title={exam.name}
              subtitle={exam.class?.name}
              actions={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Link className="btn btn--primary btn--sm" href={`/admin/exams/${id}/results`}>
                    {t('academic.examResultsBtn')}
                  </Link>
                  {exam.state === 'draft' && (
                    <ConfirmActionButton
                      label={t('admin.initResults')}
                      confirmMessage={t('admin.confirmInitResults')}
                      path={endpoints.admin.examResultsInit(id)}
                      onSuccess={() => router.push(`/admin/exams/${id}/results`)}
                    />
                  )}
                  {(exam.state === 'draft' || exam.state === 'published') && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setEditing((v) => !v)}
                    >
                      {editing ? t('common.cancel') : t('common.edit')}
                    </button>
                  )}
                </div>
              }
            />
            {editing ? (
              <ExamForm
                exam={exam}
                onSaved={() => {
                  setEditing(false);
                  state.reload();
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <div className="section row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <ExamWorkflowActions id={exam.id} state={exam.state} onUpdated={() => state.reload()} />
                </div>
                <ExamDetailPanel
                  exam={exam}
                  manageRole="admin"
                  allowExamUpload
                  onAttachmentsChanged={() => state.reload()}
                />
              </>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
