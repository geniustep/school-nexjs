'use client';

/**
 * Teaching Progress is derived and read-only — this panel only displays the
 * backend-computed summary, never recomputes coverage locally.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/primitives';
import { fetchTeacherTeachingProgressSummary } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingProgressSummary } from '@/types/teaching-delivery';
import '@/features/teacher/delivery/delivery.css';

export function TeacherTeachingProgressSummaryPanel() {
  const t = useT();
  const [data, setData] = useState<TeachingProgressSummary | null>(null);

  useEffect(() => {
    fetchTeacherTeachingProgressSummary().then((res) => {
      if (res.success) setData(res.data);
    });
  }, []);

  if (!data) return null;

  return (
    <TeacherWorkspaceCard title={t('teacher.teachingProgress.summaryTitle')}>
      <div className="delivery-progress-summary">
        <Badge tone="blue"><bdi dir="ltr">{data.coverage_percent ?? 0}%</bdi> {t('teacher.teachingProgress.coverage')}</Badge>
        <span>{t('teacher.teachingProgress.plannedLines')}: <bdi dir="ltr">{data.planned_lines ?? 0}</bdi></span>
        <span>{t('teacher.teachingProgress.startedLines')}: <bdi dir="ltr">{data.started_lines ?? 0}</bdi></span>
        <span>{t('teacher.teachingProgress.completedLines')}: <bdi dir="ltr">{data.completed_lines ?? 0}</bdi></span>
        <span>{t('teacher.teachingProgress.delayedLines')}: <bdi dir="ltr">{data.delayed_lines ?? 0}</bdi></span>
      </div>
      {data.classes_needing_attention && data.classes_needing_attention.length > 0 && (
        <p className="alert alert--warning">
          {t('teacher.teachingProgress.classesNeedingAttention')}: {data.classes_needing_attention.map((c) => c.name).join(', ')}
        </p>
      )}
      {data.last_delivery && (
        <p className="muted">
          {t('teacher.teachingProgress.lastDelivery')}: {data.last_delivery.delivered_title ?? data.last_delivery.session_date ?? '—'}
        </p>
      )}
    </TeacherWorkspaceCard>
  );
}
