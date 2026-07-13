'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { TeacherContentCard, TeacherEmptyState, TeacherSection } from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import { fetchTeacherSessionOccurrences } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
import { resolveTeacherJathathaPrimaryCta } from '@/features/teacher/jathatha/utils/jathatha-teacher-present';
import { resolveTeacherSessionPrimaryCta } from '@/features/teacher/delivery/utils/delivery-teacher-present';
import type { SessionOccurrenceSummary } from '@/types/jathatha';

function weekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { date_from: monday.toISOString().slice(0, 10), date_to: sunday.toISOString().slice(0, 10) };
}

export function TeacherWeekSessions() {
  const t = useT();
  const range = useMemo(weekRange, []);
  const [data, setData] = useState<SessionOccurrenceSummary[] | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    fetchTeacherSessionOccurrences(range).then((res) => {
      if (res.success) setData(res.data);
      else setError(res.error);
      setLoading(false);
    });
  };
  useEffect(load, [range]);
  const state = { data, error, loading, initialLoading: loading && data === null, fetching: loading && data !== null, reload: load, meta: null };

  return (
    <TeacherSection title={t('teacher.jathatha.weekSessions')}>
      <ResourceView state={state} loadingLabel={t('common.loading')} compactLinking isEmpty={(rows) => rows.length === 0}
        empty={<TeacherEmptyState icon="📅" title={t('teacher.jathatha.emptyWeek')} description={t('teacher.jathatha.emptyWeek')} compact />}>
        {(rows) => <div className="grid grid--content-cards">{rows.map((occurrence) => {
          // Rows here are always real session occurrences fetched from the backend —
          // never a synthetic weekly-slot placeholder — so delivery CTAs are safe to show.
          const cta = resolveTeacherSessionPrimaryCta(occurrence, resolveTeacherJathathaPrimaryCta(occurrence));
          return <TeacherContentCard key={occurrence.id} href={`/teacher/sessions/${occurrence.id}`}
            title={`${occurrence.date ?? '—'} · ${occurrence.class?.name ?? '—'} · ${occurrence.subject?.name ?? '—'}`}
            badge={<WorkflowBadge state={occurrence.state} />}
            meta={<>
              <span>{[occurrence.start_time, occurrence.end_time].filter(Boolean).join(' – ')}</span>
              {occurrence.offering?.name ? <span dir="auto">{occurrence.offering.name}</span> : null}
              <WorkflowBadge state={occurrence.jathatha_state} />
              <WorkflowBadge state={occurrence.jathatha_review_state} />
              {occurrence.delivery_state && <WorkflowBadge state={occurrence.delivery_state} />}
              {occurrence.current_journal_entry_id && <span>{t('teacher.delivery.journalAvailable')}</span>}
              {occurrence.progress_summary && <span>{occurrence.progress_summary}</span>}
            </>}
            footer={cta ? <Link className="btn btn--primary btn--sm" href={cta.href}>{t(cta.labelKey)}</Link> : undefined} />;
        })}</div>}
      </ResourceView>
    </TeacherSection>
  );
}
