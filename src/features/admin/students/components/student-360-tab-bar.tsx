'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import type { Student360TabId } from '../utils/student-360-tabs';
import { buildStudent360TabHref, student360TabLabelKey } from '../utils/student-360-tabs';

export function Student360TabBar({
  studentId,
  activeTab,
  tabs,
  ariaLabel,
}: {
  studentId: string | number;
  activeTab: Student360TabId;
  tabs: readonly Student360TabId[];
  ariaLabel: string;
}) {
  const t = useT();

  return (
    <div className="student-360-tab-bar" role="tablist" aria-label={ariaLabel}>
      <div className="student-360-tab-bar__scroll">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Link
              key={tab}
              href={buildStudent360TabHref(studentId, tab)}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={cn('student-360-tab-bar__item', isActive && 'student-360-tab-bar__item--active')}
            >
              {t(student360TabLabelKey(tab))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
