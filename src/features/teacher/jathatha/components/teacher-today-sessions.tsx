'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { TeacherContentCard, TeacherEmptyState, TeacherSection } from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import { fetchTeacherSessionOccurrences } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
import { resolveTeacherJathathaPrimaryCta } from '@/features/teacher/jathatha/utils/jathatha-teacher-present';
import { resolveTeacherSessionPrimaryCta } from '@/features/teacher/delivery/utils/delivery-teacher-present';
import { TeachingProgressTodaySnippet } from '@/features/teacher/teaching-progress/components/teaching-progress-today-snippet';
import type { SessionOccurrenceSummary } from '@/types/jathatha';

export function TeacherTodaySessions() {
  const t = useT();
  const [data, setData] = useState<SessionOccurrenceSummary[] | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetchTeacherSessionOccurrences({ date: new Date().toISOString().slice(0, 10) }).then((res) => {
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
    });
  };
  useEffect(load, []);
  const state = { data, error, loading, initialLoading: loading && data === null, fetching: loading && data !== null, reload: load, meta: null };

  return (
    <>
      <TeachingProgressTodaySnippet />
      <TeacherSection title={t('teacher.jathatha.todaySessions')} action={<Link className="btn btn--ghost btn--sm" href="/teacher/timetable">{t('nav.timetable')}</Link>}>
        <ResourceView
          state={state}
          loadingLabel={t('common.loading')}
          compactLinking
          isEmpty={(rows) => rows.length === 0}
          empty={<TeacherEmptyState icon="📅" title={t('teacher.jathatha.emptyToday')} description={t('teacher.jathatha.emptyToday')} compact />}
        >
          {(rows) => (
            <div className="grid grid--content-cards">
              {rows.map((occurrence) => {
                const cta = resolveTeacherSessionPrimaryCta(occurrence, resolveTeacherJathathaPrimaryCta(occurrence));
                return (
                  <TeacherContentCard
                    key={occurrence.id}
                    href={`/teacher/sessions/${occurrence.id}`}
                    title={`${occurrence.class?.name ?? '—'} · ${occurrence.subject?.name ?? '—'}`}
                    badge={<WorkflowBadge state={occurrence.state} />}
                    meta={<>
                      <span>{[occurrence.start_time, occurrence.end_time].filter(Boolean).join(' – ')}</span>
                      {occurrence.room && <span>{occurrence.room}</span>}
                      <WorkflowBadge state={occurrence.jathatha_state} />
                      <WorkflowBadge state={occurrence.jathatha_review_state} />
                      {occurrence.delivery_state && <WorkflowBadge state={occurrence.delivery_state} />}
                      {occurrence.current_journal_entry_id && <span>{t('teacher.delivery.journalAvailable')}</span>}
                      {occurrence.progress_summary && <span>{occurrence.progress_summary}</span>}
                      {occurrence.is_current && <span>{t('teacher.jathatha.current')}</span>}
                      {occurrence.is_next && <span>{t('teacher.jathatha.next')}</span>}
                      {occurrence.teachable === false && <span>{t('teacher.jathatha.notTeachable')}</span>}
                    </>}
                    footer={cta ? <Link className="btn btn--primary btn--sm" href={cta.href}>{t(cta.labelKey)}</Link> : undefined}
                  />
                );
              })}
            </div>
          )}
        </ResourceView>
      </TeacherSection>
    </>
  );
}
