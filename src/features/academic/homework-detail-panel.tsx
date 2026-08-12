'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, DefinitionList, InfoBanner, Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { canSubmitHomework } from '@/features/academic/utils';
import type { HomeworkDetail } from '@/types/homework';
import { SmartLinkCards } from '@/components/attachments/smart-link-cards';
import '@/features/attachments/secure-materials/secure-materials.css';

interface HomeworkDetailPanelProps {
  hw: HomeworkDetail;
  readPath: string;
  submitPath: string;
  onUpdated: () => void;
}

export function HomeworkDetailPanel({
  hw,
  readPath,
  submitPath,
  onUpdated,
}: HomeworkDetailPanelProps) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const toast = useToast();
  const [acting, setActing] = useState(false);
  const [comment, setComment] = useState(hw.my_submission?.comment ?? '');
  const allowSubmit = canSubmitHomework(hw);

  async function markRead() {
    if (hw.is_read) return;
    setActing(true);
    const res = await api.post(readPath);
    setActing(false);
    if (res.success) {
      toast.success(t('academic.readSuccess'));
      onUpdated();
    } else {
      toast.error(res.error.message);
    }
  }

  async function submit() {
    if (!allowSubmit) return;
    if (!comment.trim()) {
      toast.error(t('errors.submitCommentRequired'));
      return;
    }
    setActing(true);
    const res = await api.post(submitPath, { comment: comment.trim() });
    setActing(false);
    if (res.success) {
      toast.success(t('academic.submitSuccess'));
      onUpdated();
    } else {
      toast.error(res.error.message);
    }
  }

  return (
    <>
      <Card>
        <DefinitionList
          items={[
            { label: t('academic.status'), value: <WorkflowBadge state={hw.state} /> },
            { label: t('academic.subject'), value: hw.subject?.name ?? t('common.dash') },
            { label: t('academic.teacher'), value: hw.teacher?.name ?? t('common.dash') },
            {
              label: t('academic.deadline'),
              value: hw.deadline ? formatDate(hw.deadline) : t('common.dash'),
            },
            {
              label: t('academic.readStatus'),
              value: hw.is_read ? (
                <Badge tone="green">{t('common.yes')}</Badge>
              ) : (
                <Badge tone="amber">{t('common.no')}</Badge>
              ),
            },
            {
              label: t('academic.submittedStatus'),
              value: hw.submitted ? (
                <Badge tone="green">{t('common.yes')}</Badge>
              ) : (
                <Badge tone="slate">{t('common.no')}</Badge>
              ),
            },
            ...(hw.is_late
              ? [{ label: t('badges.late'), value: <Badge tone="red">{t('badges.late')}</Badge> }]
              : []),
            ...(hw.submission_state
              ? [
                  {
                    label: t('academic.submissionState'),
                    value: <WorkflowBadge state={hw.submission_state} />,
                  },
                ]
              : []),
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
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('academic.attachments')}</h2>
          <Card>
            <AttachmentList attachments={hw.attachments} />
          </Card>
        </div>
      )}
      {hw.links?.length ? (
        <div className="section"><h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('secureMaterials.title')}</h2><Card><SmartLinkCards links={hw.links} /></Card></div>
      ) : null}

      {hw.my_submission && (
        <div className="section">
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>{t('academic.mySubmission')}</h2>
          <Card>
            <DefinitionList
              items={[
                {
                  label: t('academic.status'),
                  value: <WorkflowBadge state={hw.my_submission.state} />,
                },
                {
                  label: t('academic.submissionDate'),
                  value: formatDateTime(hw.my_submission.submission_date),
                },
                { label: t('academic.comment'), value: hw.my_submission.comment ?? t('common.dash') },
                {
                  label: t('academic.teacherFeedback'),
                  value: hw.my_submission.teacher_feedback || t('common.dash'),
                },
              ]}
            />
            {hw.my_submission.attachments && hw.my_submission.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentList attachments={hw.my_submission.attachments} />
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="section row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {!hw.is_read && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={acting}
            onClick={markRead}
          >
            {t('common.markRead')}
          </button>
        )}
      </div>

      {allowSubmit && (
        <div className="section">
          <Card>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{t('academic.submitText')}</h3>
            <textarea
              className="textarea"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('academic.submitPlaceholder')}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <button
              type="button"
              className="btn btn--primary btn--sm mt-2"
              disabled={acting}
              onClick={submit}
            >
              {acting ? t('common.submitting') : t('common.submit')}
            </button>
          </Card>
        </div>
      )}

      {(hw.state === 'closed' || hw.state === 'archived') && (
        <InfoBanner
          tone="amber"
          title={t('academic.homeworkClosed')}
          description={t('academic.homeworkClosedDesc')}
        />
      )}
      {hw.state === 'published' && !hw.require_submission && (
        <InfoBanner
          tone="blue"
          title={t('academic.readOnlyHomework')}
          description={t('academic.readOnlyHomeworkDesc')}
        />
      )}
    </>
  );
}
