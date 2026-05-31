'use client';

import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';

interface HomeworkWorkflowActionsProps {
  id: number;
  state: string;
  onUpdated: () => void;
}

export function HomeworkWorkflowActions({ id, state, onUpdated }: HomeworkWorkflowActionsProps) {
  const t = useT();
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {state === 'draft' && (
        <ConfirmActionButton
          label={t('common.publish')}
          confirmMessage={t('admin.confirmPublishHomework')}
          path={endpoints.admin.homeworkPublish(id)}
          variant="primary"
          onSuccess={onUpdated}
        />
      )}
      {state === 'published' && (
        <ConfirmActionButton
          label={t('common.close')}
          confirmMessage={t('admin.confirmCloseHomework')}
          path={endpoints.admin.homeworkClose(id)}
          onSuccess={onUpdated}
        />
      )}
      {state !== 'archived' && (
        <ConfirmActionButton
          label={t('admin.archive')}
          confirmMessage={t('admin.confirmArchive')}
          path={endpoints.admin.homeworkArchive(id)}
          variant="danger"
          onSuccess={onUpdated}
        />
      )}
    </div>
  );
}

interface ResourceWorkflowActionsProps {
  id: number;
  state: string;
  onUpdated: () => void;
}

export function ResourceWorkflowActions({ id, state, onUpdated }: ResourceWorkflowActionsProps) {
  const t = useT();
  if (state === 'archived') return null;
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {state === 'draft' && (
        <ConfirmActionButton
          label={t('common.publish')}
          confirmMessage={t('admin.confirmPublishResource')}
          path={endpoints.admin.resourcePublish(id)}
          variant="primary"
          onSuccess={onUpdated}
        />
      )}
      <ConfirmActionButton
        label={t('admin.archive')}
        confirmMessage={t('admin.confirmArchive')}
        path={endpoints.admin.resourceArchive(id)}
        variant="danger"
        onSuccess={onUpdated}
      />
    </div>
  );
}

interface ExamWorkflowActionsProps {
  id: number;
  state: string;
  onUpdated: () => void;
}

export function ExamWorkflowActions({ id, state, onUpdated }: ExamWorkflowActionsProps) {
  const t = useT();
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {state === 'draft' && (
        <ConfirmActionButton
          label={t('common.publish')}
          confirmMessage={t('admin.confirmPublishExam')}
          path={endpoints.admin.examPublish(id)}
          variant="primary"
          onSuccess={onUpdated}
        />
      )}
      {state === 'published' && (
        <>
          <ConfirmActionButton
            label={t('admin.markDone')}
            confirmMessage={t('admin.confirmMarkDone')}
            path={endpoints.admin.examDone(id)}
            onSuccess={onUpdated}
          />
          <ConfirmActionButton
            label={t('admin.cancelExam')}
            confirmMessage={t('admin.confirmCancelExam')}
            path={endpoints.admin.examCancel(id)}
            onSuccess={onUpdated}
          />
        </>
      )}
      {state !== 'archived' && state !== 'cancelled' && (
        <ConfirmActionButton
          label={t('admin.archive')}
          confirmMessage={t('admin.confirmArchive')}
          path={endpoints.admin.examArchive(id)}
          variant="danger"
          onSuccess={onUpdated}
        />
      )}
    </div>
  );
}

interface ExamResultWorkflowActionsProps {
  id: number;
  state: string;
  onUpdated: () => void;
}

export function ExamResultWorkflowActions({
  id,
  state,
  onUpdated,
}: ExamResultWorkflowActionsProps) {
  const t = useT();
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {state === 'draft' && (
        <ConfirmActionButton
          label={t('common.publish')}
          confirmMessage={t('admin.confirmPublishResult')}
          path={endpoints.admin.examResultPublish(id)}
          variant="primary"
          onSuccess={onUpdated}
        />
      )}
      {state !== 'archived' && (
        <ConfirmActionButton
          label={t('admin.archive')}
          confirmMessage={t('admin.confirmArchive')}
          path={endpoints.admin.examResultArchive(id)}
          variant="danger"
          onSuccess={onUpdated}
        />
      )}
    </div>
  );
}
