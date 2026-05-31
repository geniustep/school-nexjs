'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';

export function ChildAcademicActions({ childId }: { childId: string }) {
  const t = useT();
  const base = `/parent/children/${childId}`;
  const actions = [
    { key: 'nav.homework', href: `${base}/homeworks`, icon: '📝' },
    { key: 'nav.resources', href: `${base}/resources`, icon: '📚' },
    { key: 'nav.exams', href: `${base}/exams`, icon: '📋' },
    { key: 'nav.results', href: `${base}/exam-results`, icon: '📊' },
    { key: 'nav.timetable', href: `${base}/timetable`, icon: '📅' },
  ];

  return (
    <div className="class-actions">
      {actions.map((a) => (
        <Link key={a.href} href={a.href} className="btn btn--ghost btn--sm class-actions__btn">
          <span aria-hidden="true">{a.icon}</span>
          {t(a.key)}
        </Link>
      ))}
    </div>
  );
}
