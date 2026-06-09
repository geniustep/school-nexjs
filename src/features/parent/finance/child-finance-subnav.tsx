'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';

export function ChildFinanceSubnav({ id }: { id: string }) {
  const t = useT();
  const pathname = usePathname();
  const base = `/parent/children/${id}/finance`;
  const tabs = [
    { labelKey: 'parent.finance.summary', href: base },
    { labelKey: 'parent.finance.allCollections', href: `${base}/collections` },
  ];
  return (
    <nav className="tabs" aria-label={t('parent.finance.title')}>
      {tabs.map((tab) => {
        const active = pathname === tab.href || (tab.href !== base && pathname.startsWith(tab.href));
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
