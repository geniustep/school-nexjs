'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';

const ACTION_KEYS = [
  { key: 'actions.attendance', suffix: '/teacher/attendance?class=', icon: '🗓️', query: true },
  { key: 'actions.homework', suffix: '/homeworks', icon: '📝' },
  { key: 'actions.resources', suffix: '/resources', icon: '📚' },
  { key: 'actions.exams', suffix: '/exams', icon: '📋' },
  { key: 'actions.results', suffix: '/exam-results', icon: '📊' },
  { key: 'actions.students', suffix: '', icon: '🎓', isRoot: true },
] as const;

export function ClassActionGrid({ classId }: { classId: number }) {
  const t = useT();
  const id = String(classId);
  const base = `/teacher/classes/${id}`;

  return (
    <div className="class-actions">
      {ACTION_KEYS.map((a) => {
        let href = base;
        if ('query' in a && a.query) href = `/teacher/attendance?class=${id}`;
        else if ('isRoot' in a && a.isRoot) href = base;
        else href = `${base}${a.suffix}`;

        return (
          <Link key={a.key} href={href} className="btn btn--ghost btn--sm class-actions__btn">
            <span aria-hidden="true">{a.icon}</span>
            {t(a.key)}
          </Link>
        );
      })}
    </div>
  );
}
