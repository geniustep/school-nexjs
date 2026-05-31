'use client';

import { TimetableSlotCard } from '@/features/timetable/timetable-slot-card';
import { dayLabel, sortSlotsByTime } from '@/features/timetable/utils';
import { useT } from '@/features/i18n/locale-context';
import type { TimetableSlot } from '@/types/timetable';

interface DayTimetableSectionProps {
  day: string;
  dayLabelText?: string | null;
  slots: TimetableSlot[];
  showTeacher?: boolean;
}

export function DayTimetableSection({
  day,
  dayLabelText,
  slots,
  showTeacher = true,
}: DayTimetableSectionProps) {
  const t = useT();
  if (!slots.length) return null;

  return (
    <section className="timetable-day">
      <h2 className="timetable-day__title">{dayLabel(day, t, dayLabelText)}</h2>
      <div className="timetable-day__slots">
        {sortSlotsByTime(slots).map((slot) => (
          <TimetableSlotCard key={slot.id} slot={slot} showTeacher={showTeacher} />
        ))}
      </div>
    </section>
  );
}
