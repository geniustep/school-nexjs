'use client';

import Link from 'next/link';
import { use } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { HomeworkSubmission } from '@/types/homework';

export default function HomeworkSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { formatDateTime } = useFormat();
  const state = useResource<HomeworkSubmission[]>(endpoints.teacher.homeworkSubmissions(id));

  return (
    <>
      <Link href={`/teacher/homeworks/${id}`} className="back-link">
        ‹ {t('academic.homeworkDetail')}
      </Link>
      <PageHeader title={t('academic.homeworkSubmissions')} subtitle={`#${id}`} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon="📥" title={t('empty.submissions')} description={t('empty.submissions')} />
        }
      >
        {(items) => (
          <div className="grid grid--cards">
            {items.map((sub) => (
              <Card key={sub.id}>
                <div className="between">
                  <strong>{getStudentDisplayName(sub.student)}</strong>
                  <WorkflowBadge state={sub.state} />
                </div>
                <div className="mt-2 tiny muted">
                  {sub.submission_date && (
                    <span>
                      {t('academic.submissionDate')}: {formatDateTime(sub.submission_date)}
                    </span>
                  )}
                </div>
                {sub.comment && (
                  <p className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {sub.comment}
                  </p>
                )}
                {sub.teacher_feedback && (
                  <p className="mt-2 tiny muted">
                    {t('academic.teacherComment')}: {sub.teacher_feedback}
                  </p>
                )}
                {sub.attachments && sub.attachments.length > 0 && (
                  <div className="mt-2">
                    <AttachmentList attachments={sub.attachments} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
