'use client';

/**
 * Light Today integration: link to planning + optional next-item hint.
 * Does not replace undocumented-session CTAs or create a parallel data source.
 */

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';

export function TeachingProgressTodaySnippet() {
  const t = useT();

  return (
    <TeacherWorkspaceCard title={t('teacher.teachingProgress.programProgress')}>
      <p className="muted">{t('teacher.teachingProgress.todaySnippetDesc')}</p>
      <Link className="btn btn--ghost btn--sm" href="/teacher/teaching/planning">
        {t('teacher.teachingProgress.openPlanning')}
      </Link>
    </TeacherWorkspaceCard>
  );
}
