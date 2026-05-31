'use client';

import { useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { DayTimetableSection } from '@/features/timetable/day-timetable-section';
import { TimetableSlotCard } from '@/features/timetable/timetable-slot-card';
import { TimetableTabs, type TimetableTab } from '@/features/timetable/timetable-tabs';
import {
  WEEK_DAY_ORDER,
  dayLabel,
  sortSlotsByTime,
  weekHasSlots,
} from '@/features/timetable/utils';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { TodayTimetable, WeekTimetable } from '@/types/timetable';

interface TimetableViewProps {
  todayPath: string;
  weekPath: string;
  showTeacher?: boolean;
}

function TodayPanel({
  todayPath,
  showTeacher,
}: {
  todayPath: string;
  showTeacher: boolean;
}) {
  const t = useT();
  const { formatDateLong } = useFormat();
  const state = useResource<TodayTimetable>(todayPath);

  return (
    <ResourceView state={state} loadingLabel={t('timetable.loadingToday')}>
      {(data) => {
        const slots = sortSlotsByTime(data.slots ?? []);
        const hasHighlight = data.current_slot || data.next_slot;
        const hasAny = hasHighlight || slots.length > 0;

        if (!hasAny) {
          return (
            <EmptyState
              icon="📅"
              title={t('empty.timetableToday')}
              description={t('empty.timetableToday')}
            />
          );
        }

        return (
          <>
            {data.date && (
              <InfoBanner
                tone="blue"
                title={`${dayLabel(data.day, t)} · ${formatDateLong(data.date)}`}
                description={t('timetable.todaySchedule')}
              />
            )}

            {(data.current_slot || data.next_slot) && (
              <div className="section">
                {data.current_slot && (
                  <div className="mb-2">
                    <p className="tiny muted mb-2">{t('timetable.currentClass')}</p>
                    <TimetableSlotCard slot={data.current_slot} showTeacher={showTeacher} />
                  </div>
                )}
                {data.next_slot && data.next_slot.id !== data.current_slot?.id && (
                  <div>
                    <p className="tiny muted mb-2">{t('timetable.nextClass')}</p>
                    <TimetableSlotCard slot={data.next_slot} showTeacher={showTeacher} />
                  </div>
                )}
              </div>
            )}

            {slots.length > 0 && (
              <div className="section">
                <h2 style={{ fontSize: 15, marginBottom: 10 }}>{t('timetable.todayClasses')}</h2>
                <div className="timetable-day__slots">
                  {slots.map((slot) => (
                    <TimetableSlotCard key={slot.id} slot={slot} showTeacher={showTeacher} />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      }}
    </ResourceView>
  );
}

function WeekPanel({
  weekPath,
  showTeacher,
}: {
  weekPath: string;
  showTeacher: boolean;
}) {
  const t = useT();
  const state = useResource<WeekTimetable>(weekPath);

  return (
    <ResourceView state={state} loadingLabel={t('timetable.loadingWeek')}>
      {(data) => {
        const week = data.week ?? {};

        if (!weekHasSlots(week)) {
          return (
            <EmptyState
              icon="📅"
              title={t('empty.timetableWeek')}
              description={t('empty.timetableWeek')}
            />
          );
        }

        return (
          <div className="timetable-week">
            {WEEK_DAY_ORDER.map((day) => (
              <DayTimetableSection
                key={day}
                day={day}
                slots={week[day] ?? []}
                showTeacher={showTeacher}
              />
            ))}
          </div>
        );
      }}
    </ResourceView>
  );
}

export function TimetableView({
  todayPath,
  weekPath,
  showTeacher = true,
}: TimetableViewProps) {
  const [tab, setTab] = useState<TimetableTab>('today');

  return (
    <>
      <TimetableTabs tab={tab} onChange={setTab} />
      <div className="mt-2">
        {tab === 'today' ? (
          <TodayPanel todayPath={todayPath} showTeacher={showTeacher} />
        ) : (
          <WeekPanel weekPath={weekPath} showTeacher={showTeacher} />
        )}
      </div>
    </>
  );
}
