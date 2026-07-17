'use client';

/**
 * Light Today integration: link to planning + optional next-item hint.
 * Does not replace undocumented-session CTAs or create a parallel data source.
 */

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { buildTeacherPlanningHref } from '@/features/teaching-progress/planning-url';
import { TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';

export function TeachingProgressTodaySnippet({
  classId,
  offeringId,
}: {
  classId?: number | null;
  offeringId?: number | null;
} = {}) {
  const t = useT();
  const href = buildTeacherPlanningHref({
    classId,
    offeringId,
    returnTo: '/teacher/dashboard',
  });

  return (
    <TeacherWorkspaceCard title={t('teacher.teachingProgress.programProgress')}>
      <p className="muted">{t('teacher.teachingProgress.todaySnippetDesc')}</p>
      <Link className="btn btn--ghost btn--sm" href={href}>
        {t('teacher.teachingProgress.openPlanning')}
      </Link>
    </TeacherWorkspaceCard>
  );
}
