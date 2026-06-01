'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { ExamAttachmentsUpload } from '@/features/attachments/exam-attachments-upload';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, DefinitionList } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamDetail } from '@/types/exam';

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<ExamDetail>(endpoints.teacher.exam(id));

  return (
    <>
      <Link
        href={
          state.data?.class?.id
            ? `/teacher/classes/${state.data.class.id}/exams`
            : '/teacher/classes'
        }
        className="back-link"
      >
        ‹ {t('academic.backToExams')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(exam) => (
          <>
            <PageHeader
              title={exam.name}
              subtitle={exam.class?.name}
              actions={
                <Link
                  className="btn btn--primary btn--sm"
                  href={`/teacher/exams/${id}/results`}
                >
                  {t('academic.examResultsBtn')}
                </Link>
              }
            />
            <Card>
              <DefinitionList
                items={[
                  { label: t('academic.status'), value: <WorkflowBadge state={exam.state} /> },
                  { label: t('academic.type'), value: exam.exam_type_label ?? exam.exam_type },
                  { label: t('academic.subject'), value: exam.subject?.name },
                  { label: t('academic.date'), value: formatDate(exam.exam_date) },
                  {
                    label: t('academic.time'),
                    value:
                      exam.start_time && exam.end_time
                        ? `${exam.start_time} – ${exam.end_time}`
                        : t('common.dash'),
                  },
                  { label: t('academic.room'), value: exam.room ?? t('common.dash') },
                  { label: t('academic.coefficient'), value: exam.coefficient ?? t('common.dash') },
                ]}
              />
              {exam.instructions && (
                <div className="mt-2">
                  <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('academic.instructions')}</h3>
                  <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {exam.instructions}
                  </p>
                </div>
              )}
            </Card>
            <div className="section">
              <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('attachments.examAttachments')}</h2>
              <Card>
                {exam.attachments && exam.attachments.length > 0 ? (
                  <AttachmentList
                    attachments={exam.attachments}
                    manageRole="teacher"
                    onChanged={() => state.reload()}
                  />
                ) : (
                  <p className="tiny muted">{t('attachments.noAttachments')}</p>
                )}
                <ExamAttachmentsUpload
                  examId={exam.id}
                  existingCount={exam.attachments?.length ?? 0}
                  messageScope="teacher"
                  onUploaded={() => state.reload()}
                />
              </Card>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
