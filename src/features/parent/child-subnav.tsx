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
    { label: 'Student view', href: `${base}/student-view` },
    { label: 'Attendance', href: `${base}/attendance` },
    { label: 'Channels', href: `${base}/channels` },
    { label: 'Announcements', href: `${base}/announcements` },
  ];
  return (
    <div className="wrap-gap" style={{ marginBlockEnd: 16 }}>
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn('btn btn--sm', active ? 'btn--primary' : 'btn--ghost')}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
