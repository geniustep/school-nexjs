'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/ui/primitives';
import {
  academicCalendarEventIsProvisional,
  academicCalendarEventTypeLabelKey,
  academicCalendarScopeLabelKey,
  mergeCalendarEventsForDisplay,
} from '@/features/admin/academic-calendars/utils/academic-calendar-present';
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
};

const COPY: Record<'ar' | 'en' | 'fr' | 'es', Copy> = {
  ar: {
    title: 'قراءة سريعة للعطل والإغلاقات',
    subtitle: 'الأحداث مرتبة زمنيًا حسب الشهر لتسهيل قراءة السنة الدراسية.',
    officialHoliday: 'عطلة رسمية',
    schoolBreak: 'عطلة مدرسية',
    schoolClosure: 'إغلاق المؤسسة',
    otherEvent: 'حدث تقويمي',
    localOverride: 'تعديل محلي',
    durationDay: 'يوم واحد',
    durationDays: '{count} أيام',
  },
  en: {
    title: 'Quick view of breaks and closures',
    subtitle: 'Events are grouped by month to make the school year easier to scan.',
    officialHoliday: 'Official holiday',
    schoolBreak: 'School break',
    schoolClosure: 'School closure',
    otherEvent: 'Calendar event',
    localOverride: 'Local override',
    durationDay: '1 day',
    durationDays: '{count} days',
  },
  fr: {
    title: 'Lecture rapide des congés et fermetures',
    subtitle: 'Les événements sont regroupés par mois pour faciliter la lecture de l’année scolaire.',
    officialHoliday: 'Jour férié officiel',
    schoolBreak: 'Vacances scolaires',
    schoolClosure: 'Fermeture de l’établissement',
    otherEvent: 'Événement du calendrier',
    localOverride: 'Ajustement local',
    durationDay: '1 jour',
    durationDays: '{count} jours',
  },
  es: {
    title: 'Vista rápida de vacaciones y cierres',
    subtitle: 'Los eventos se agrupan por mes para facilitar la lectura del curso escolar.',
    officialHoliday: 'Festivo oficial',
    schoolBreak: 'Vacaciones escolares',
    schoolClosure: 'Cierre del centro',
    otherEvent: 'Evento del calendario',
    localOverride: 'Ajuste local',
    durationDay: '1 día',
    durationDays: '{count} días',
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
  return translated !== key ? translated : event.scope_type;
}

export function AcademicCalendarEventReading({ calendar }: { calendar: AcademicCalendarDetail }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const copy = COPY[locale];

  const events = useMemo(
    () => mergeCalendarEventsForDisplay(calendar.events, calendar.provisional_events),
    [calendar.events, calendar.provisional_events],
  );

  const groups = useMemo(() => {
    const map = new Map<string, AcademicCalendarEvent[]>();
    for (const event of events) {
      const key = monthKey(event.date_from);
      const group = map.get(key) ?? [];
      group.push(event);
      map.set(key, group);
    }
    return Array.from(map.entries());
  }, [events]);

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

  return createPortal(
    <section className="academic-calendar-event-reading" aria-labelledby="academic-calendar-event-reading-title">
      <header className="academic-calendar-event-reading__head">
        <div>
          <h2 id="academic-calendar-event-reading-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <Badge tone="slate">{events.length}</Badge>
      </header>

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
                const typeKey = academicCalendarEventTypeLabelKey(event.event_type);
                const translatedType = t(typeKey);
                const detailType = translatedType !== typeKey ? translatedType : event.event_type;
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
                      {scope ? <span className="muted tiny" dir="auto">{scope}</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>,
    portalTarget,
  );
}
