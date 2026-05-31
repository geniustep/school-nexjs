'use client';

import { Badge, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { formatTimeRange, slotStatus } from '@/features/timetable/utils';

interface TimetableSlotCardProps {
  slot: {
    id: number;
    subject?: { name: string } | null;
    class?: { name: string } | null;
    teacher?: { name: string } | null;
    start_time?: string | null;
    end_time?: string | null;
    room?: string | null;
    is_current?: boolean;
    is_next?: boolean;
  };
  showTeacher?: boolean;
}

export function TimetableSlotCard({ slot, showTeacher = true }: TimetableSlotCardProps) {
  const t = useT();
  const status = slotStatus(slot as Parameters<typeof slotStatus>[0]);

  return (
    <Card
      className={
        status === 'current'
          ? 'timetable-slot timetable-slot--current'
          : status === 'next'
            ? 'timetable-slot timetable-slot--next'
            : 'timetable-slot'
      }
    >
      <div className="between">
        <strong style={{ fontSize: 15 }}>{slot.subject?.name ?? '—'}</strong>
        <div className="row" style={{ gap: 6 }}>
          {status === 'current' && <Badge tone="green">{t('badges.current')}</Badge>}
          {status === 'next' && <Badge tone="blue">{t('badges.next')}</Badge>}
        </div>
      </div>
      <div className="timetable-slot__meta">
        <span>{formatTimeRange(slot.start_time, slot.end_time)}</span>
        {slot.class?.name && <span>{slot.class.name}</span>}
        {showTeacher && slot.teacher?.name && <span>{slot.teacher.name}</span>}
        {slot.room && <span>{t('common.room', { room: slot.room })}</span>}
      </div>
    </Card>
  );
}
