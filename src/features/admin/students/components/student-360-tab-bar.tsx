'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import type { Student360TabId } from '../utils/student-360-tabs';
import { buildStudent360TabHref, student360TabLabelKey } from '../utils/student-360-tabs';
import type { Student360TabIndicator } from '../utils/student-360-tab-indicators';

export function Student360TabBar({
  studentId,
  activeTab,
  tabs,
  ariaLabel,
  indicators,
}: {
  studentId: string | number;
  activeTab: Student360TabId;
  tabs: readonly Student360TabId[];
  ariaLabel: string;
  indicators?: Partial<Record<Student360TabId, Student360TabIndicator>>;
}) {
  const t = useT();

  return (
    <nav className="student-360-tab-bar" role="tablist" aria-label={ariaLabel}>
      <div className="student-360-tab-bar__scroll">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          const indicator = indicators?.[tab];
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
              <span className="student-360-tab-bar__label">{t(student360TabLabelKey(tab))}</span>
              {indicator ? (
                <span
                  className={cn(
                    'student-360-tab-bar__indicator',
                    indicator.tone && `student-360-tab-bar__indicator--${indicator.tone}`,
                  )}
                  title={indicator.label}
                  aria-label={indicator.label}
                >
                  {indicator.label.length <= 3 ? indicator.label : indicator.label.slice(0, 2)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
