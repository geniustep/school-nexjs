'use client';

import Link from 'next/link';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Card, StatCard } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatScore, formatPercentage } from '@/features/academic/utils';
import type { ExamResult, ExamResultsListResponse } from '@/types/exam';

interface ExamResultsListPanelProps {
  data: ExamResultsListResponse;
  detailHref: (resultId: number) => string;
}

export function ExamResultsListPanel({ data, detailHref }: ExamResultsListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();

  const columns: Column<ExamResult>[] = [
    {
      key: 'exam',
      header: t('academic.exam'),
      render: (r) => (
        <Link href={detailHref(r.id)}>
          <strong>{r.exam?.name ?? t('common.dash')}</strong>
        </Link>
      ),
    },
    { key: 'subject', header: t('academic.subject'), render: (r) => r.subject?.name ?? t('common.dash') },
    {
      key: 'score',
      header: t('academic.score'),
      render: (r) => formatScore(r.score, r.max_score),
    },
    {
      key: 'percentage',
      header: t('academic.percentage'),
      render: (r) => formatPercentage(r.percentage),
    },
    { key: 'grade', header: t('academic.grade'), render: (r) => r.grade_label ?? t('common.dash') },
    {
      key: 'state',
      header: t('academic.status'),
      render: (r) => <WorkflowBadge state={r.state} />,
    },
    {
      key: 'date',
      header: t('academic.date'),
      render: (r) => formatDate(r.exam?.exam_date),
    },
  ];

  const summary = data.summary;

  return (
    <>
      {summary && (
        <div className="grid grid--stats mb-2">
          {summary.average != null && summary.average >= 0 && (
            <StatCard label={t('academic.average')} value={`${summary.average}%`} icon="📊" />
          )}
          {summary.published_results_count != null && (
            <StatCard
              label={t('academic.publishedResultsCount')}
              value={summary.published_results_count}
              icon="✅"
            />
          )}
          {summary.best_subject && (
            <StatCard label={t('academic.bestSubject')} value={summary.best_subject} icon="⭐" />
          )}
        </div>
      )}
      {summary?.needs_support_subjects && summary.needs_support_subjects.length > 0 && (
        <Card className="mb-2">
          <p className="tiny muted">
            {t('academic.needsSupport')}: {summary.needs_support_subjects.join(', ')}
          </p>
        </Card>
      )}
      <Card pad={false}>
        <DataTable columns={columns} rows={data.results} rowKey={(r) => r.id} />
      </Card>
    </>
  );
}
