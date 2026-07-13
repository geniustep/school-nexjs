'use client';

/**
 * Class Teaching Journal entry detail — fully read-only. A Journal entry is
 * never the same object as the Actual Delivery Record it was generated from.
 */

import { useEffect, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { fetchTeacherClassJournalEntry } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { TeacherPageHeader, TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { ClassJournalEntryDetail } from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

const CONTENT_FIELDS: (keyof ClassJournalEntryDetail)[] = [
  'content_summary',
  'objective_achievement_summary',
  'actual_pages_label',
  'assessment_summary',
  'journal_text',
];

export function TeacherClassJournalDetail({ entryId }: { entryId: string }) {
  const t = useT();
  const [data, setData] = useState<ClassJournalEntryDetail | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const load = () =>
    fetchTeacherClassJournalEntry(entryId).then((res) => (res.success ? setData(res.data) : setError(res.error)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);
  if (error) return <ApiErrorView error={error} onRetry={load} />;
  if (!data) return <LoadingState label={t('common.loading')} />;

  const details = [
    data.session_date,
    [data.session_start_time, data.session_end_time].filter(Boolean).join(' – '),
    data.teacher?.name,
    data.class?.name,
    data.subject?.name,
    data.offering?.name,
    data.distribution?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader title={data.delivered_title || t('teacher.classJournal.title')} subtitle={details} />
      <div className="row mb-2">
        <TeachingPrintLink href={`/teacher/class-journal/${data.id}/print`} />
        <WorkflowBadge state={data.state} />
        {data.revision_no != null && <span>{t('teacher.delivery.revision', { number: data.revision_no })}</span>}
      </div>

      <TeacherWorkspaceCard title={t('teacher.classJournal.distributionLine')}>
        <p>{data.distribution_line?.name ?? '—'}</p>
        {data.deviation_type && data.deviation_type !== 'none' && (
          <p className="muted">
            {t(`teacher.delivery.deviation.${data.deviation_type}`)}
            {data.deviation_reason ? `: ${data.deviation_reason}` : ''}
          </p>
        )}
      </TeacherWorkspaceCard>

      <TeacherWorkspaceCard title={t('teacher.classJournal.content')}>
        <div className="stack">
          {CONTENT_FIELDS.map((field) =>
            data[field] ? (
              <p key={field}>
                <strong>{t(`teacher.delivery.${field}`)}:</strong> {String(data[field])}
              </p>
            ) : null,
          )}
          <p>
            {t('teacher.delivery.completionState')}:{' '}
            {data.completion_state ? t(`teacher.delivery.completion.${data.completion_state}`) : '—'}
            {data.completion_percent != null ? ` (${data.completion_percent}%)` : ''}
          </p>
        </div>
      </TeacherWorkspaceCard>

      {data.source_delivery && (
        <TeacherWorkspaceCard title={t('teacher.classJournal.sourceDelivery')}>
          <p>
            {t('teacher.delivery.revision', { number: data.source_delivery.revision_no })} ·{' '}
            <WorkflowBadge state={data.source_delivery.state} />
          </p>
        </TeacherWorkspaceCard>
      )}

      {data.revision_lineage && data.revision_lineage.length > 0 && (
        <TeacherWorkspaceCard title={t('teacher.classJournal.revisionLineage')}>
          <ul>
            {data.revision_lineage.map((revision) => (
              <li key={revision.id}>
                #{revision.revision_no} · <WorkflowBadge state={revision.state} />
              </li>
            ))}
          </ul>
        </TeacherWorkspaceCard>
      )}
    </div>
  );
}
