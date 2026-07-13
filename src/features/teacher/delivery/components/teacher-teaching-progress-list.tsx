'use client';

/**
 * Teaching Progress lines are derived and read-only — this list never
 * exposes create/edit/delete controls.
 */

import { useEffect, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { TeacherContentCard, TeacherEmptyState, TeacherPageHeader } from '@/features/teacher/ui/teacher-primitives';
import { fetchTeacherTeachingProgress } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { TeacherTeachingProgressSummaryPanel } from '@/features/teacher/delivery/components/teacher-teaching-progress-summary-panel';
import { TeacherAssignmentScopePanel } from '@/features/teacher/academic-context/teacher-assignment-scope-panel';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { TeachingProgressLineSummary } from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

export function TeacherTeachingProgressList() {
  const t = useT();
  const [data, setData] = useState<TeachingProgressLineSummary[] | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetchTeacherTeachingProgress().then((res) => {
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
    });
  };
  useEffect(load, []);
  const state = { data, error, loading, initialLoading: loading && data === null, fetching: loading && data !== null, reload: load, meta: null };

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader title={t('teacher.teachingProgress.title')} subtitle={t('teacher.teachingProgress.subtitle')} />
      <div className="row mb-2">
        <TeachingPrintLink href="/teacher/teaching-progress/print?print_scope=all_filtered" />
      </div>
      <TeacherAssignmentScopePanel scope="teaching_planning" />
      <TeacherTeachingProgressSummaryPanel />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        compactLinking
        isEmpty={(rows) => rows.length === 0}
        empty={<TeacherEmptyState icon="📈" title={t('teacher.teachingProgress.empty')} description={t('teacher.teachingProgress.empty')} />}
      >
        {(rows) => (
          <div className="grid grid--content-cards">
            {rows.map((line) => (
              <TeacherContentCard
                key={line.id}
                href={`/teacher/teaching-progress/${line.id}`}
                title={`${line.class?.name ?? '—'} · ${line.subject?.name ?? '—'} · ${line.title ?? line.name ?? '—'}`}
                badge={<WorkflowBadge state={line.status} />}
                meta={
                  <>
                    {line.coverage_percent != null && <span><bdi dir="ltr">{line.coverage_percent}%</bdi></span>}
                    {line.delayed && <span>{t('teacher.teachingProgress.delayed')}</span>}
                  </>
                }
              />
            ))}
          </div>
        )}
      </ResourceView>
    </div>
  );
}
