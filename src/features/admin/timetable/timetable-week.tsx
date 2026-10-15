import type { TimetableSlot } from '@/types/timetable';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { presentTimetableDay, presentTimetableTimeRange } from './utils/timetable-list-present';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function minutes(value?: string | null): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value ?? '');
  if (!match || +match[1] > 23 || +match[2] > 59) return null;
  return +match[1] * 60 + +match[2];
}

/** Presentation only: never infer conflicts or publication eligibility. */
export function groupWeek(slots: TimetableSlot[]) {
  const valid = slots.filter((s) => {
    const start = minutes(s.start_time), end = minutes(s.end_time);
    return WEEK_DAYS.includes(s.day ?? '') && start !== null && end !== null && end > start;
  });
  const ranges = [...new Set(valid.map((s) => `${s.start_time!.slice(0, 5)}–${s.end_time!.slice(0, 5)}`))].sort();
  return { valid, ranges, incomplete: slots.filter((s) => !valid.includes(s)) };
}

export function TimetableWeek({ slots, t }: { slots: TimetableSlot[]; t: TranslateFn }) {
  const { valid, ranges, incomplete } = groupWeek(slots);
  // Retain Sunday when supplied; do not invent school working days.
  const days = WEEK_DAYS.filter((day) => day !== 'sunday' || slots.some((s) => s.day === day));
  const session = (s: TimetableSlot) => <article key={s.id} className="timetable-week__session">
    <strong dir="auto">{s.subject?.name ?? t('common.dash')}</strong>
    <span dir="auto">{s.teacher?.name ?? t('common.dash')}</span>
    <span dir="auto">{s.class?.name ?? t('common.dash')}{s.room ? ` · ${s.room}` : ''}</span>
  </article>;
  return <section aria-label={t('timetableWorkspace.week')}>
    <p className="timetable-week__caption">{t('timetableWorkspace.recurring')}</p>
    <div className="timetable-week__scroll" tabIndex={0} role="region" aria-label={t('timetableWorkspace.week')}>
      <table className="timetable-week">
        <caption className="sr-only">{t('timetableWorkspace.recurring')}</caption>
        <thead><tr><th scope="col">{t('academic.time')}</th>{days.map((day) => <th scope="col" key={day}>{t(`days.${day}`)}</th>)}</tr></thead>
        <tbody>{ranges.map((range) => <tr key={range}>
          <th scope="row"><span dir="ltr">{range}</span></th>
          {days.map((day) => <td key={day}>{valid.filter((s) => s.day === day && `${s.start_time!.slice(0, 5)}–${s.end_time!.slice(0, 5)}` === range).map(session)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {!!incomplete.length && <section className="timetable-week__incomplete"><h3>{t('timetableWorkspace.incomplete')}</h3>{incomplete.map((s) => <div key={s.id}><span>{presentTimetableDay(s, t, t('common.dash'))} · </span><span dir="ltr">{presentTimetableTimeRange(s.start_time, s.end_time, t('common.dash'))}</span>{session(s)}</div>)}</section>}
  </section>;
}
