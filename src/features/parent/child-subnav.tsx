'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';

export function ChildSubnav({ id }: { id: string }) {
  const t = useT();
  const pathname = usePathname();
  const base = `/parent/children/${id}`;
  const tabs = [
    { labelKey: 'nav.overview', href: base },
    { labelKey: 'nav.childView', href: `${base}/student-view` },
    { labelKey: 'nav.attendance', href: `${base}/attendance` },
    { labelKey: 'nav.homework', href: `${base}/homeworks` },
    { labelKey: 'nav.resources', href: `${base}/resources` },
    { labelKey: 'nav.exams', href: `${base}/exams` },
    { labelKey: 'nav.results', href: `${base}/exam-results` },
    { labelKey: 'nav.timetable', href: `${base}/timetable` },
    { labelKey: 'nav.channels', href: `${base}/channels` },
    { labelKey: 'nav.announcements', href: `${base}/announcements` },
  ];
  return (
    <nav className="tabs" aria-label={t('nav.myChildren')}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn('tab', active && 'tab--active')}
            aria-current={active ? 'page' : undefined}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
