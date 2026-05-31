'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { HomeworkWorkflowActions } from '@/features/admin/admin-workflow-actions';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { HomeworkDetail, HomeworkSubmission } from '@/types/homework';

interface AdminHomeworkDetailPanelProps {
  hw: HomeworkDetail;
  onUpdated: () => void;
}

export function AdminHomeworkDetailPanel({ hw, onUpdated }: AdminHomeworkDetailPanelProps) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();

  const submissionColumns: Column<HomeworkSubmission>[] = [
    {
      key: 'student',
      header: t('actions.students'),
      render: (s) => <strong>{getStudentDisplayName(s.student)}</strong>,
    },
    {
      key: 'state',
      header: t('academic.status'),
      render: (s) => <WorkflowBadge state={s.state} />,
    },
    {
      key: 'date',
      header: t('academic.submissionDate'),
      render: (s) => formatDateTime(s.submission_date),
    },
    {
      key: 'comment',
      header: t('academic.comment'),
      render: (s) => s.comment ?? t('common.dash'),
    },
  ];

  return (
    <>
      <div className="section row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <HomeworkWorkflowActions id={hw.id} state={hw.state} onUpdated={onUpdated} />
      </div>
      <Card>
        <DefinitionList
          items={[
            { label: t('academic.status'), value: <WorkflowBadge state={hw.state} /> },
            { label: t('nav.classes'), value: hw.class?.name ?? t('common.dash') },
            { label: t('academic.subject'), value: hw.subject?.name ?? t('common.dash') },
            { label: t('academic.teacher'), value: hw.teacher?.name ?? t('common.dash') },
            {
              label: t('academic.publishDate'),
              value: hw.publish_date ? formatDate(hw.publish_date) : t('common.dash'),
            },
            {
              label: t('academic.deadline'),
              value: hw.deadline ? formatDate(hw.deadline) : t('common.dash'),
            },
            {
              label: t('academic.requiresSubmission'),
              value: hw.require_submission ? t('common.yes') : t('common.no'),
            },
          ]}
        />
        {hw.description && (
          <div className="mt-2">
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('academic.description')}</h3>
            <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
              {hw.description}
            </p>
          </div>
        )}
      </Card>

      {hw.attachments && hw.attachments.length > 0 && (
        <div className="section">
          <SectionHead title={t('academic.attachments')} />
          <Card>
            <AttachmentList attachments={hw.attachments} />
          </Card>
        </div>
      )}

      {hw.submissions && hw.submissions.length > 0 && (
        <div className="section">
          <SectionHead title={t('academic.homeworkSubmissions')} />
          <Card pad={false}>
            <DataTable columns={submissionColumns} rows={hw.submissions} rowKey={(s) => s.id} />
          </Card>
        </div>
      )}
    </>
  );
}

/** Inline score edit for admin exam results (draft only). */
export function AdminExamResultEditRow({
  row,
  onSaved,
}: {
  row: import('@/types/exam').ExamResult;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [score, setScore] = useState(String(row.score >= 0 ? row.score : ''));
  const [comment, setComment] = useState(row.teacher_comment ?? '');
  const [saving, setSaving] = useState(false);
  const isDraft = row.state === 'draft';

  async function save() {
    if (!isDraft) return;
    const parsed = Number(score);
    if (Number.isNaN(parsed)) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const res = await api.post(endpoints.admin.examResultUpdate(row.id), {
      score: parsed,
      teacher_comment: comment,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('academic.saveSuccess'));
      onSaved();
    } else {
      toast.error(res.error.message);
    }
  }

  if (!isDraft) return <span className="tiny muted">{t('academic.cannotEditPublished')}</span>;

  return (
    <div className="result-edit row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <input
        className="input input--sm"
        type="number"
        min={0}
        max={row.max_score}
        step="0.5"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        style={{ width: 72 }}
      />
      <input
        className="input"
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('academic.teacherComment')}
        style={{ minWidth: 140, flex: 1 }}
      />
      <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </div>
  );
}
