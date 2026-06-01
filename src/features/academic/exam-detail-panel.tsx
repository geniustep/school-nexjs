'use client';

import { AttachmentList } from '@/components/attachments/attachment-list';
import { ExamAttachmentsUpload } from '@/features/attachments/exam-attachments-upload';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, DefinitionList } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatTimeRange } from '@/features/timetable/utils';
import type { AttachmentManageRole } from '@/lib/api/attachments';
import type { ExamDetail } from '@/types/exam';

interface ExamDetailPanelProps {
  exam: ExamDetail;
  manageRole?: AttachmentManageRole | null;
  onAttachmentsChanged?: () => void;
  allowExamUpload?: boolean;
}

export function ExamDetailPanel({
  exam,
  manageRole = null,
  onAttachmentsChanged,
  allowExamUpload = false,
}: ExamDetailPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const showAttachmentsSection =
    (exam.attachments?.length ?? 0) > 0 || (allowExamUpload && manageRole);

  return (
    <>
      <Card>
        <DefinitionList
          items={[
            { label: t('academic.status'), value: <WorkflowBadge state={exam.state} /> },
            { label: t('academic.subject'), value: exam.subject?.name ?? t('common.dash') },
            { label: t('academic.date'), value: formatDate(exam.exam_date) },
            {
              label: t('academic.time'),
              value: formatTimeRange(exam.start_time, exam.end_time),
            },
            { label: t('academic.room'), value: exam.room ?? t('common.dash') },
            { label: t('academic.teacher'), value: exam.teacher?.name ?? t('common.dash') },
            {
              label: t('academic.type'),
              value: exam.exam_type_label ?? exam.exam_type ?? t('common.dash'),
            },
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
      {showAttachmentsSection && (
        <div className="section">
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('attachments.examAttachments')}</h2>
          <Card>
            {exam.attachments && exam.attachments.length > 0 ? (
              <AttachmentList
                attachments={exam.attachments}
                manageRole={manageRole}
                onChanged={onAttachmentsChanged}
              />
            ) : (
              <p className="tiny muted">{t('attachments.noAttachments')}</p>
            )}
            {allowExamUpload && manageRole && onAttachmentsChanged && (
              <ExamAttachmentsUpload
                examId={exam.id}
                existingCount={exam.attachments?.length ?? 0}
                messageScope={manageRole}
                onUploaded={onAttachmentsChanged}
              />
            )}
          </Card>
        </div>
      )}
    </>
  );
}
