'use client';

import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';

export type TimetableTab = 'today' | 'week';

interface TimetableTabsProps {
  tab: TimetableTab;
  onChange: (tab: TimetableTab) => void;
}

export function TimetableTabs({ tab, onChange }: TimetableTabsProps) {
  const t = useT();
  return (
    <nav className="tabs" aria-label={t('timetable.title')}>
      <button
        type="button"
        className={cn('tab', tab === 'today' && 'tab--active')}
        onClick={() => onChange('today')}
      >
        {t('timetable.tabToday')}
      </button>
      <button
        type="button"
        className={cn('tab', tab === 'week' && 'tab--active')}
        onClick={() => onChange('week')}
      >
        {t('timetable.tabWeek')}
      </button>
    </nav>
  );
}
