'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Card, InfoBanner } from '@/components/ui/primitives';
import {
  AdminExamResultEditRow,
} from '@/features/admin/admin-homework-detail';
import {
  ExamResultWorkflowActions,
} from '@/features/admin/admin-workflow-actions';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ExamResult } from '@/types/exam';

export default function AdminExamResultsByExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ExamResult[]>(endpoints.admin.examResultsByExam(id));

  const columns: Column<ExamResult>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('actions.students'),
        render: (r) => <strong>{getStudentDisplayName(r.student)}</strong>,
      },
      {
        key: 'score',
        header: t('academic.score'),
        render: (r) => (
          <span>
            {r.score >= 0 ? r.score : t('common.dash')} / {r.max_score}
          </span>
        ),
      },
      {
        key: 'percentage',
        header: t('academic.percentage'),
        render: (r) => (r.percentage >= 0 ? `${r.percentage}%` : t('common.dash')),
      },
      {
        key: 'grade',
        header: t('academic.grade'),
        render: (r) => r.grade_label ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (r) => <WorkflowBadge state={r.state} />,
      },
      {
        key: 'comment',
        header: t('academic.teacherComment'),
        render: (r) => r.teacher_comment ?? t('common.dash'),
      },
      {
        key: 'edit',
        header: t('common.edit'),
        render: (r) => <AdminExamResultEditRow row={r} onSaved={() => state.reload()} />,
      },
      {
        key: 'actions',
        header: t('admin.actions'),
        render: (r) => (
          <ExamResultWorkflowActions id={r.id} state={r.state} onUpdated={() => state.reload()} />
        ),
      },
    ],
    [t, state],
  );

  return (
    <>
      <Link href={`/admin/exams/${id}`} className="back-link">
        ‹ {t('academic.examDetail')}
      </Link>
      <PageHeader
        title={t('academic.examResults')}
        subtitle={`#${id}`}
        actions={
          <ConfirmActionButton
            label={t('admin.initResults')}
            confirmMessage={t('admin.confirmInitResults')}
            path={endpoints.admin.examResultsInit(id)}
            onSuccess={() => state.reload()}
          />
        }
      />
      <InfoBanner
        tone="blue"
        title={t('academic.editPolicy')}
        description={t('academic.editPolicyDesc')}
      />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon="📊" title={t('empty.results')} description={t('admin.noResultsInit')} />
        }
      >
        {(rows) => (
          <Card pad={false}>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
          </Card>
        )}
      </ResourceView>
    </>
  );
}
