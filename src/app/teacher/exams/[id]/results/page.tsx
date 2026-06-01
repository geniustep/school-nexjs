'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Card, InfoBanner } from '@/components/ui/primitives';
import { InitExamResultsButton } from '@/features/teacher/init-exam-results-button';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ExamResult } from '@/types/exam';

function ResultEditRow({
  row,
  onSaved,
}: {
  row: ExamResult;
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
    const res = await api.post(endpoints.teacher.examResultUpdate(row.id), {
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

  if (!isDraft) {
    return (
      <span className="tiny muted">
        {row.state === 'published' || row.state === 'archived'
          ? t('academic.cannotEditPublished')
          : t('common.dash')}
      </span>
    );
  }

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
        aria-label={t('academic.score')}
        style={{ width: 72 }}
      />
      <input
        className="input"
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('academic.teacherComment')}
        aria-label={t('academic.teacherComment')}
        style={{ minWidth: 140, flex: 1 }}
      />
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={saving}
        onClick={save}
      >
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </div>
  );
}

export default function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ExamResult[]>(endpoints.teacher.examResults(id));

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
        render: (r) => <ResultEditRow row={r} onSaved={() => state.reload()} />,
      },
    ],
    [t, state],
  );

  return (
    <>
      <Link href={`/teacher/exams/${id}`} className="back-link">
        ‹ {t('academic.examDetail')}
      </Link>
      <PageHeader title={t('academic.examResults')} subtitle={`#${id}`} />
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
          <EmptyState
            icon="📊"
            title={t('empty.results')}
            description={t('teacher.initResultsHint')}
            action={
              <InitExamResultsButton examId={id} onSuccess={() => state.reload()} />
            }
          />
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
