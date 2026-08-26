'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/primitives';
import {
  academicCalendarDayPartLabelKey,
  academicCalendarEventIsProvisional,
  academicCalendarEventTypeLabelKey,
  academicCalendarScopeLabelKey,
  mergeCalendarEventsForDisplay,
} from '@/features/admin/academic-calendars/utils/academic-calendar-present';
import {
  academicCalendarEventMatchesReadingFilter,
  type AcademicCalendarReadingFilter,
} from '@/features/admin/academic-calendars/utils/academic-calendar-event-review';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { AcademicCalendarDetail, AcademicCalendarEvent } from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendar-event-reading.css';

type Copy = {
  title: string;
  subtitle: string;
  officialHoliday: string;
  schoolBreak: string;
  schoolClosure: string;
  otherEvent: string;
  localOverride: string;
  durationDay: string;
  durationDays: string;
  filterAll: string;
  filterHolidaysClosures: string;
  filterMilestones: string;
  filterExams: string;
  noFilteredEvents: string;
};

const COPY: Record<'ar' | 'en' | 'fr' | 'es', Copy> = {
  ar: {
    title: 'أحداث السنة في لمحة',
    subtitle: 'الأحداث مرتبة زمنيًا حسب الشهر لتسهيل قراءة السنة الدراسية.',
    officialHoliday: 'عطلة رسمية',
    schoolBreak: 'عطلة مدرسية',
    schoolClosure: 'إغلاق المؤسسة',
    otherEvent: 'حدث تقويمي',
    localOverride: 'تعديل محلي',
    durationDay: 'يوم واحد',
    durationDays: '{count} أيام',
    filterAll: 'الكل',
    filterHolidaysClosures: 'العطل والإغلاقات',
    filterMilestones: 'المحطات الدراسية',
    filterExams: 'الامتحانات والتقويم',
    noFilteredEvents: 'لا توجد أحداث ضمن هذا التصنيف.',
  },
  en: {
    title: 'School year at a glance',
    subtitle: 'Events are grouped by month to make the school year easier to scan.',
    officialHoliday: 'Official holiday',
    schoolBreak: 'School break',
    schoolClosure: 'School closure',
    otherEvent: 'Calendar event',
    localOverride: 'Local override',
    durationDay: '1 day',
    durationDays: '{count} days',
    filterAll: 'All',
    filterHolidaysClosures: 'Breaks & closures',
    filterMilestones: 'School milestones',
    filterExams: 'Exams & assessment',
    noFilteredEvents: 'No events match this category.',
  },
  fr: {
    title: 'L’année scolaire en un coup d’œil',
    subtitle: 'Les événements sont regroupés par mois pour faciliter la lecture de l’année scolaire.',
    officialHoliday: 'Jour férié officiel',
    schoolBreak: 'Vacances scolaires',
    schoolClosure: 'Fermeture de l’établissement',
    otherEvent: 'Événement du calendrier',
    localOverride: 'Ajustement local',
    durationDay: '1 jour',
    durationDays: '{count} jours',
    filterAll: 'Tout',
    filterHolidaysClosures: 'Congés et fermetures',
    filterMilestones: 'Étapes scolaires',
    filterExams: 'Examens et évaluations',
    noFilteredEvents: 'Aucun événement dans cette catégorie.',
  },
  es: {
    title: 'El curso escolar de un vistazo',
    subtitle: 'Los eventos se agrupan por mes para facilitar la lectura del curso escolar.',
    officialHoliday: 'Festivo oficial',
    schoolBreak: 'Vacaciones escolares',
    schoolClosure: 'Cierre del centro',
    otherEvent: 'Evento del calendario',
    localOverride: 'Ajuste local',
    durationDay: '1 día',
    durationDays: '{count} días',
    filterAll: 'Todos',
    filterHolidaysClosures: 'Vacaciones y cierres',
    filterMilestones: 'Hitos escolares',
    filterExams: 'Exámenes y evaluación',
    noFilteredEvents: 'No hay eventos en esta categoría.',
  },
};

function eventCategory(event: AcademicCalendarEvent, copy: Copy) {
  if (event.event_type === 'national_holiday' || event.event_type === 'religious_holiday') {
    return { key: 'official', label: copy.officialHoliday, tone: 'blue' as const };
  }
  if (event.event_type === 'inter_term_break' || event.event_type === 'mid_year_break') {
    return { key: 'break', label: copy.schoolBreak, tone: 'green' as const };
  }
  if (event.event_type === 'school_closure') {
    return { key: 'closure', label: copy.schoolClosure, tone: 'amber' as const };
  }
  return { key: 'other', label: copy.otherEvent, tone: 'slate' as const };
}

function inclusiveDurationDays(event: AcademicCalendarEvent): number | null {
  if (!event.date_from || !event.date_to) return null;
  const start = Date.parse(`${event.date_from}T00:00:00Z`);
  const end = Date.parse(`${event.date_to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function monthKey(date: string): string {
  return date?.slice(0, 7) || 'unknown';
}

function monthLabel(date: string, locale: string): string {
  const parsed = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 7);
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function scopeLabel(event: AcademicCalendarEvent, t: (key: string) => string): string | null {
  const direct = event.class?.name || event.level?.name || event.cycle?.name;
  if (direct) return direct;
  if (!event.scope_type) return null;
  const key = academicCalendarScopeLabelKey(event.scope_type);
  const translated = t(key);
  return translated !== key ? translated : null;
}

function dayPartLabel(event: AcademicCalendarEvent, t: (key: string) => string): string | null {
  if (!event.day_part || event.day_part === 'full_day') return null;
  const key = academicCalendarDayPartLabelKey(event.day_part);
  const translated = t(key);
  return translated !== key ? translated : null;
}

export function AcademicCalendarEventReading({ calendar }: { calendar: AcademicCalendarDetail }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [filter, setFilter] = useState<AcademicCalendarReadingFilter>('all');
  const copy = COPY[locale];

  const events = useMemo(
    () => mergeCalendarEventsForDisplay(calendar.events, calendar.provisional_events),
    [calendar.events, calendar.provisional_events],
  );

  const filteredEvents = useMemo(
    () => events.filter((event) => academicCalendarEventMatchesReadingFilter(event, filter)),
    [events, filter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, AcademicCalendarEvent[]>();
    for (const event of filteredEvents) {
      const key = monthKey(event.date_from);
      const group = map.get(key) ?? [];
      group.push(event);
      map.set(key, group);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  useEffect(() => {
    if (events.length === 0) {
      setPortalTarget(null);
      return;
    }

    const detailRoot = document.querySelector<HTMLElement>('.academic-calendar-detail');
    if (!detailRoot) return;
    const headings = Array.from(
      detailRoot.querySelectorAll<HTMLElement>('.academic-calendar-detail__section-head h2'),
    );
    const eventHeading = headings.find(
      (heading) => heading.textContent?.trim() === t('admin.academicCalendars.events.title').trim(),
    );
    const eventCard = eventHeading?.closest<HTMLElement>('.card');
    if (!eventCard) return;

    const host = document.createElement('div');
    host.className = 'academic-calendar-event-reading__host';
    eventCard.insertAdjacentElement('beforebegin', host);
    setPortalTarget(host);

    return () => {
      setPortalTarget(null);
      host.remove();
    };
  }, [calendar.id, events.length, t]);

  if (!portalTarget || events.length === 0) return null;

  const filters: Array<{ key: AcademicCalendarReadingFilter; label: string }> = [
    { key: 'all', label: copy.filterAll },
    { key: 'holiday_closure', label: copy.filterHolidaysClosures },
    { key: 'milestone', label: copy.filterMilestones },
    { key: 'exam', label: copy.filterExams },
  ];

  return createPortal(
    <section className="academic-calendar-event-reading" aria-labelledby="academic-calendar-event-reading-title">
      <header className="academic-calendar-event-reading__head">
        <div>
          <h2 id="academic-calendar-event-reading-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <Badge tone="slate">{filteredEvents.length}</Badge>
      </header>

      <div className="academic-calendar-event-reading__filters" role="group" aria-label={copy.title}>
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={filter === item.key ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="academic-calendar-event-reading__empty muted">{copy.noFilteredEvents}</p>
      ) : (
        <div className="academic-calendar-event-reading__months">
          {groups.map(([key, monthEvents]) => (
            <section className="academic-calendar-event-reading__month" key={key}>
              <h3>{monthLabel(monthEvents[0]?.date_from ?? key, locale)}</h3>
              <div className="academic-calendar-event-reading__items">
                {monthEvents.map((event) => {
                  const category = eventCategory(event, copy);
                  const duration = inclusiveDurationDays(event);
                  const singleDay = event.date_from === event.date_to;
                  const scope = scopeLabel(event, t);
                  const dayPart = dayPartLabel(event, t);
                  const typeKey = academicCalendarEventTypeLabelKey(event.event_type);
                  const translatedType = t(typeKey);
                  const detailType = translatedType !== typeKey ? translatedType : category.label;
                  return (
                    <article
                      key={event.id}
                      className={`academic-calendar-event-reading__item academic-calendar-event-reading__item--${category.key}`}
                    >
                      <div className="academic-calendar-event-reading__item-main">
                        <div className="academic-calendar-event-reading__badges">
                          <Badge tone={category.tone}>{category.label}</Badge>
                          {academicCalendarEventIsProvisional(event) ? (
                            <Badge tone="amber">{t('admin.academicCalendars.provisional')}</Badge>
                          ) : (
                            <Badge tone="green">{t('admin.academicCalendars.confirmed')}</Badge>
                          )}
                          {event.is_local_override ? <Badge tone="slate">{copy.localOverride}</Badge> : null}
                        </div>
                        <strong dir="auto">{event.name}</strong>
                        <span className="muted tiny" dir="auto">{detailType}</span>
                      </div>

                      <div className="academic-calendar-event-reading__when">
                        <strong>
                          {singleDay
                            ? formatDate(event.date_from)
                            : `${formatDate(event.date_from)} – ${formatDate(event.date_to)}`}
                        </strong>
                        {duration != null ? (
                          <span className="muted tiny">
                            {duration === 1
                              ? copy.durationDay
                              : copy.durationDays.replace('{count}', String(duration))}
                          </span>
                        ) : null}
                        {dayPart ? <span className="muted tiny">{dayPart}</span> : null}
                        {scope ? <span className="muted tiny" dir="auto">{scope}</span> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>,
    portalTarget,
  );
}
