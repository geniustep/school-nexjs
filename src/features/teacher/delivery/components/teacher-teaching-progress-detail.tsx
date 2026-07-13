'use client';

/**
 * Teaching Progress line detail — fully read-only, derived from confirmed
 * Actual Delivery Records. Never editable here.
 */

import { useEffect, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { fetchTeacherTeachingProgressLine } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { TeacherPageHeader, TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingProgressLineDetail } from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

export function TeacherTeachingProgressDetail({ lineId }: { lineId: string }) {
  const t = useT();
  const [data, setData] = useState<TeachingProgressLineDetail | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const load = () =>
    fetchTeacherTeachingProgressLine(lineId).then((res) => (res.success ? setData(res.data) : setError(res.error)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId]);
  if (error) return <ApiErrorView error={error} onRetry={load} />;
  if (!data) return <LoadingState label={t('common.loading')} />;

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader
        title={data.title ?? data.name ?? t('teacher.teachingProgress.title')}
        subtitle={[data.class?.name, data.subject?.name, data.offering?.name, data.distribution?.name].filter(Boolean).join(' · ')}
      />
      <div className="row mb-2">
        <TeachingPrintLink href={`/teacher/teaching-progress/${data.id}/print`} />
        <WorkflowBadge state={data.status} />
        {data.delayed && <span className="alert alert--warning">{t('teacher.teachingProgress.delayed')}</span>}
      </div>

      <TeacherWorkspaceCard title={t('teacher.teachingProgress.stats')}>
        <div className="row">
          <span>{t('teacher.teachingProgress.plannedSessions')}: <bdi dir="ltr">{data.planned_sessions ?? '—'}</bdi></span>
          <span>{t('teacher.teachingProgress.delivered')}: <bdi dir="ltr">{data.delivered_units ?? 0}</bdi></span>
          <span>{t('teacher.teachingProgress.remaining')}: <bdi dir="ltr">{data.remaining_units ?? 0}</bdi></span>
          <span>{t('teacher.teachingProgress.coverage')}: <bdi dir="ltr">{data.coverage_percent ?? 0}%</bdi></span>
        </div>
        {data.delayed_explanation && <p className="alert alert--warning">{data.delayed_explanation}</p>}
      </TeacherWorkspaceCard>

      {data.contributing_deliveries && data.contributing_deliveries.length > 0 && (
        <TeacherWorkspaceCard title={t('teacher.teachingProgress.contributingDeliveries')}>
          <ul>
            {data.contributing_deliveries.map((delivery) => (
              <li key={delivery.id}>
                {delivery.session_date} · {delivery.delivered_title ?? '—'} · <WorkflowBadge state={delivery.state} />
              </li>
            ))}
          </ul>
        </TeacherWorkspaceCard>
      )}

      {data.planned_dates && data.planned_dates.length > 0 && (
        <TeacherWorkspaceCard title={t('teacher.teachingProgress.plannedDates')}>
          <p className="muted"><bdi dir="ltr">{data.planned_dates.join(', ')}</bdi></p>
        </TeacherWorkspaceCard>
      )}
    </div>
  );
}
