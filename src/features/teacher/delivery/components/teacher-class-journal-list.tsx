'use client';

/**
 * Class Teaching Journal is generated and read-only — this list never
 * exposes create/edit/delete controls.
 */

import { useEffect, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { TeacherContentCard, TeacherEmptyState, TeacherPageHeader } from '@/features/teacher/ui/teacher-primitives';
import { fetchTeacherClassJournal } from '@/features/teacher/delivery/api/teacher-delivery-api';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import type { ClassJournalEntrySummary } from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

export function TeacherClassJournalList() {
  const t = useT();
  const [data, setData] = useState<ClassJournalEntrySummary[] | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetchTeacherClassJournal().then((res) => {
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
    });
  };
  useEffect(load, []);
  const state = { data, error, loading, initialLoading: loading && data === null, fetching: loading && data !== null, reload: load, meta: null };

  return (
    <div className="teacher-workspace">
      <TeacherPageHeader title={t('teacher.classJournal.title')} subtitle={t('teacher.classJournal.subtitle')} />
      <div className="row mb-2">
        <TeachingPrintLink href="/teacher/class-journal/print?print_scope=all_filtered" />
      </div>
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        compactLinking
        isEmpty={(rows) => rows.length === 0}
        empty={<TeacherEmptyState icon="📘" title={t('teacher.classJournal.empty')} description={t('teacher.classJournal.empty')} />}
      >
        {(rows) => (
          <div className="grid grid--content-cards">
            {rows.map((entry) => (
              <TeacherContentCard
                key={entry.id}
                href={`/teacher/class-journal/${entry.id}`}
                title={`${entry.class?.name ?? '—'} · ${entry.subject?.name ?? '—'}`}
                badge={<WorkflowBadge state={entry.state} />}
                meta={
                  <>
                    <span>{entry.session_date}</span>
                    {entry.delivered_title && <span>{entry.delivered_title}</span>}
                    {entry.deviation_type && entry.deviation_type !== 'none' && (
                      <span>{t(`teacher.delivery.deviation.${entry.deviation_type}`)}</span>
                    )}
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
