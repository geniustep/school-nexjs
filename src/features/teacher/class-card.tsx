'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { levelName } from '@/features/teacher/use-class-info';
import { TeacherQuickChip } from '@/features/teacher/ui/teacher-primitives';
import type { TeacherDashboardClass } from '@/types/dashboard';
import type { SchoolClass } from '@/types/class';

type ClassLike =
  | TeacherDashboardClass
  | (Partial<SchoolClass> & { id: number; name: string });

const FULL_ACTIONS = [
  { key: 'actions.attendance', href: (id: number) => `/teacher/attendance?class=${id}`, icon: '🗓️' },
  { key: 'actions.homework', href: (id: number) => `/teacher/classes/${id}/homeworks`, icon: '📝' },
  { key: 'actions.resources', href: (id: number) => `/teacher/classes/${id}/resources`, icon: '📚' },
  { key: 'actions.exams', href: (id: number) => `/teacher/classes/${id}/exams`, icon: '📋' },
  { key: 'actions.results', href: (id: number) => `/teacher/classes/${id}/exam-results`, icon: '📊' },
  { key: 'actions.students', href: (id: number) => `/teacher/classes/${id}/students`, icon: '🎓' },
] as const;

const COMPACT_CHIPS = FULL_ACTIONS.slice(0, 3);

function statusBadge(
  t: ReturnType<typeof useT>,
  classInfo: ClassLike,
  pending: number,
) {
  if (pending > 0) {
    return <Badge tone="amber">{t('badges.pending', { count: pending })}</Badge>;
  }
  if ('status' in classInfo && classInfo.status) {
    const key = `states.${classInfo.status}`;
    const label = t(key);
    return (
      <Badge tone={classInfo.status === 'active' ? 'green' : 'slate'}>
        {label === key ? classInfo.status : label}
      </Badge>
    );
  }
  return <Badge tone="green">{t('badges.upToDate')}</Badge>;
}

export function ClassCard({
  classInfo,
  pending = 0,
  variant = 'full',
}: {
  classInfo: ClassLike;
  pending?: number;
  variant?: 'compact' | 'full';
}) {
  const t = useT();
  const lvl = levelName(classInfo.level);
  const hubHref = `/teacher/classes/${classInfo.id}`;

  return (
    <article className={`class-card class-card--${variant}`}>
      <div className="class-card__accent" aria-hidden="true" />
      <div className="class-card__head">
        <div className="class-card__identity">
          <strong className="class-card__name">{classInfo.name}</strong>
          <div className="class-card__meta">
            {lvl && <span className="class-card__level">{lvl}</span>}
            {typeof classInfo.student_count === 'number' && (
              <span>{t('academic.pupilCount', { count: classInfo.student_count })}</span>
            )}
          </div>
        </div>
        {statusBadge(t, classInfo, pending)}
      </div>

      <Link href={hubHref} className="btn btn--primary class-card__open">
        {t('teacher.openClass')}
      </Link>

      {variant === 'full' ? (
        <div className="class-card__actions">
          {FULL_ACTIONS.map((a) => (
            <Link
              key={a.key}
              href={a.href(classInfo.id)}
              className="class-card__action"
              title={t(a.key)}
            >
              <span className="class-card__action-icon" aria-hidden="true">{a.icon}</span>
              <span className="class-card__action-label">{t(a.key)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="class-card__chips">
          {COMPACT_CHIPS.map((a) => (
            <TeacherQuickChip
              key={a.key}
              href={a.href(classInfo.id)}
              icon={a.icon}
              label={t(a.key)}
            />
          ))}
        </div>
      )}
    </article>
  );
}
