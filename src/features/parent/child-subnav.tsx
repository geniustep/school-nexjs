'use client';

// Tab strip shared across a child's pages (detail / student-view / attendance /
// channels / announcements). All are read-only parent views.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function ChildSubnav({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/parent/children/${id}`;
  const tabs = [
    { label: 'Overview', href: base },
    { label: "Child's view", href: `${base}/student-view` },
    { label: 'Attendance', href: `${base}/attendance` },
    { label: 'Channels', href: `${base}/channels` },
    { label: 'Announcements', href: `${base}/announcements` },
  ];
  return (
    <nav className="tabs" aria-label="Child sections">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn('tab', active && 'tab--active')}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
