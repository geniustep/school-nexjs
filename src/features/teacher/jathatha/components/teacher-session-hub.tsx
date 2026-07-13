'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { TeacherPageHeader, TeacherSegmentedTabs, TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { fetchTeacherSessionOccurrence } from '@/features/teacher/jathatha/api/teacher-jathatha-api';
import { JathathaContextStep } from '@/features/teacher/jathatha/components/jathatha-context-step';
import { DeliveryContextStep } from '@/features/teacher/delivery/components/delivery-context-step';
import { useT } from '@/features/i18n/locale-context';
import type { SessionOccurrenceDetail } from '@/types/jathatha';

const TAB_KEYS = ['overview', 'jathatha', 'delivery', 'journal', 'progress', 'attendance', 'homeworks'];

export function TeacherSessionHub({ occurrenceId }: { occurrenceId: string }) {
  const t = useT();
  const search = useSearchParams();
  const requestedTab = TAB_KEYS.includes(search.get('tab') ?? '') ? search.get('tab')! : 'overview';
  const [data, setData] = useState<SessionOccurrenceDetail | null>(null);
  const [error, setError] = useState<any>(null);
  useEffect(() => { fetchTeacherSessionOccurrence(occurrenceId).then((res) => res.success ? setData(res.data) : setError(res.error)); }, [occurrenceId]);
  if (error) return <ApiErrorView error={error} onRetry={() => setError(null)} />;
  if (!data) return <LoadingState label={t('common.loading')} />;
  const actions = data.allowed_actions ?? {};
  const tabs = [
    { key: 'overview', label: t('teacher.jathatha.overview'), href: `/teacher/sessions/${occurrenceId}` },
    { key: 'jathatha', label: t('teacher.jathatha.title'), href: `/teacher/sessions/${occurrenceId}?tab=jathatha` },
    ...(actions.view_delivery || actions.create_delivery
      ? [{ key: 'delivery', label: t('teacher.delivery.tab'), href: `/teacher/sessions/${occurrenceId}?tab=delivery` }]
      : []),
    ...(actions.view_journal
      ? [{ key: 'journal', label: t('teacher.classJournal.tab'), href: `/teacher/sessions/${occurrenceId}?tab=journal` }]
      : []),
    ...(actions.view_progress
      ? [{ key: 'progress', label: t('teacher.teachingProgress.tab'), href: `/teacher/sessions/${occurrenceId}?tab=progress` }]
      : []),
    { key: 'attendance', label: t('academic.attendance'), href: `/teacher/sessions/${occurrenceId}?tab=attendance` },
    { key: 'homeworks', label: t('nav.homeworks'), href: `/teacher/sessions/${occurrenceId}?tab=homeworks` },
  ];
  const tab = tabs.some((item) => item.key === requestedTab) ? requestedTab : 'overview';
  const details = [
    data.date,
    [data.start_time, data.end_time].filter(Boolean).join(' – '),
    data.class?.name,
    data.subject?.name,
    data.offering?.name,
    data.track?.name,
    data.teaching_language?.name,
    data.teaching_reference?.name ?? data.reference?.name,
    data.room,
    data.teacher?.name,
    data.distribution?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  return <div className="teacher-workspace">
    <TeacherPageHeader title={data.subject?.name ?? t('teacher.jathatha.session')} subtitle={details} />
    <div className="row mb-2">
      <WorkflowBadge state={data.state} />
      <WorkflowBadge state={data.jathatha_state} />
      <WorkflowBadge state={data.jathatha_review_state} />
      {data.delivery_state && <WorkflowBadge state={data.delivery_state} />}
    </div>
    <TeacherSegmentedTabs items={tabs} activeKey={tab} />
    <div className="mt-3">
      {tab === 'overview' && (
        <TeacherWorkspaceCard title={t('teacher.jathatha.sessionContext')}>
          <dl className="stack">
            {data.class?.name ? (
              <>
                <dt dir="auto">{t('nav.classes')}</dt>
                <dd dir="auto">{data.class.name}</dd>
              </>
            ) : null}
            {data.subject?.name ? (
              <>
                <dt dir="auto">{t('academic.subject')}</dt>
                <dd dir="auto">{data.subject.name}</dd>
              </>
            ) : null}
            {data.offering?.name ? (
              <>
                <dt dir="auto">{t('academicContext.fields.offering')}</dt>
                <dd dir="auto">{data.offering.name}</dd>
              </>
            ) : null}
            {!data.offering?.name ? (
              <p className="muted" role="status">
                {t('academicContext.hints.legacyMissingOffering')}
              </p>
            ) : null}
            {data.track?.name ? (
              <>
                <dt dir="auto">{t('academicContext.fields.track')}</dt>
                <dd dir="auto">{data.track.name}</dd>
              </>
            ) : null}
            {data.teaching_language?.name ? (
              <>
                <dt dir="auto">{t('academicContext.fields.teachingLanguage')}</dt>
                <dd dir="auto">{data.teaching_language.name}</dd>
              </>
            ) : null}
            {(data.teaching_reference?.name ?? data.reference?.name) ? (
              <>
                <dt dir="auto">{t('academicContext.fields.reference')}</dt>
                <dd dir="auto">{data.teaching_reference?.name ?? data.reference?.name}</dd>
              </>
            ) : null}
          </dl>
        </TeacherWorkspaceCard>
      )}
      {tab === 'jathatha' && (data.current_jathatha_id ? <TeacherWorkspaceCard title={t('teacher.jathatha.title')}><p>{data.jathatha_summary}</p><Link className="btn btn--primary" href={`/teacher/jathathas/${data.current_jathatha_id}`}>{t('teacher.jathatha.open')}</Link></TeacherWorkspaceCard> : <JathathaContextStep occurrenceId={occurrenceId} />)}
      {tab === 'delivery' && (data.current_delivery_id ? <TeacherWorkspaceCard title={t('teacher.delivery.title')}><p>{data.delivery_summary}</p><Link className="btn btn--primary" href={`/teacher/actual-deliveries/${data.current_delivery_id}`}>{t('teacher.delivery.open')}</Link></TeacherWorkspaceCard> : <DeliveryContextStep occurrenceId={occurrenceId} />)}
      {tab === 'journal' && <TeacherWorkspaceCard title={t('teacher.classJournal.title')}>{data.current_journal_entry_id ? <Link className="btn btn--primary" href={`/teacher/class-journal/${data.current_journal_entry_id}`}>{t('teacher.classJournal.open')}</Link> : <p className="muted">{t('teacher.classJournal.empty')}</p>}</TeacherWorkspaceCard>}
      {tab === 'progress' && <TeacherWorkspaceCard title={t('teacher.teachingProgress.title')}>{data.progress_summary && <p>{data.progress_summary}</p>}<Link className="btn btn--ghost btn--sm" href="/teacher/teaching-progress">{t('teacher.teachingProgress.open')}</Link></TeacherWorkspaceCard>}
      {tab === 'attendance' && <TeacherWorkspaceCard title={t('academic.attendance')}><Link className="btn btn--primary" href={`/teacher/attendance${data.class?.id ? `?class=${data.class.id}` : ''}`}>{t('academic.takeAttendance')}</Link></TeacherWorkspaceCard>}
      {tab === 'homeworks' && <TeacherWorkspaceCard title={t('nav.homeworks')}><Link className="btn btn--primary" href={data.class?.id ? `/teacher/classes/${data.class.id}/homeworks` : '/teacher/homeworks'}>{t('nav.homeworks')}</Link></TeacherWorkspaceCard>}
    </div>
  </div>;
}
