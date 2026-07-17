'use client';

/**
 * Teaching Progress is derived and read-only — this panel points teachers to
 * the class-scoped planning surface (Backend summary requires class context).
 */

import Link from 'next/link';
import { TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { useT } from '@/features/i18n/locale-context';
import '@/features/teacher/delivery/delivery.css';

export function TeacherTeachingProgressSummaryPanel() {
  const t = useT();

  return (
    <TeacherWorkspaceCard title={t('teacher.teachingProgress.summaryTitle')}>
      <p className="muted">{t('teacher.teachingProgress.summaryRedirectDesc')}</p>
      <Link className="btn btn--ghost btn--sm" href="/teacher/teaching/planning">
        {t('teacher.teachingProgress.openPlanning')}
      </Link>
    </TeacherWorkspaceCard>
  );
}
