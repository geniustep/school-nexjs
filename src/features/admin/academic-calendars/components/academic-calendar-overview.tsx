'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/features/i18n/locale-context';
import { academicCalendarStudyDaysDisplay } from '@/features/admin/academic-calendars/utils/normalize-academic-calendar';
import type { AcademicCalendarDetail } from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendar-overview.css';

export function AcademicCalendarOverview({ calendar }: { calendar: AcademicCalendarDetail }) {
  const t = useT();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const summary = calendar.summary;
  const studyDays = academicCalendarStudyDaysDisplay(summary);

  useEffect(() => {
    let host: HTMLElement | null = null;
    const frame = window.requestAnimationFrame(() => {
      const detailRoot = document.querySelector<HTMLElement>('.academic-calendar-detail');
      const headerMeta = detailRoot?.querySelector<HTMLElement>('.academic-calendar-detail__header-meta');
      if (!detailRoot || !headerMeta) return;

      const warningHost = detailRoot.querySelector<HTMLElement>(
        '.academic-calendar-warning-review__host',
      );
      host = document.createElement('div');
      host.className = 'academic-calendar-overview__host';
      (warningHost ?? headerMeta).insertAdjacentElement('afterend', host);
      setPortalTarget(host);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      setPortalTarget(null);
      host?.remove();
    };
  }, [calendar.id]);

  if (!summary || !portalTarget) return null;

  const confirmed = summary.confirmed_event_count;
  const provisional = summary.provisional_event_count;
  const hasEventBreakdown = confirmed != null || provisional != null;

  return createPortal(
    <section className="academic-calendar-overview" aria-label={t('admin.academicCalendars.title')}>
      {summary.calendar_day_count != null ? (
        <div className="academic-calendar-overview__metric">
          <span>{t('admin.academicCalendars.summary.calendarDays')}</span>
          <strong>{summary.calendar_day_count}</strong>
        </div>
      ) : null}

      <div className="academic-calendar-overview__metric">
        <span>{t('admin.academicCalendars.summary.studyDays')}</span>
        <strong>
          {studyDays.reliable && studyDays.value != null
            ? studyDays.value
            : t('admin.academicCalendars.summary.studyDaysUnreliableValue')}
        </strong>
      </div>

      {summary.event_count != null ? (
        <div className="academic-calendar-overview__metric academic-calendar-overview__metric--events">
          <span>{t('admin.academicCalendars.summary.events')}</span>
          <strong>{summary.event_count}</strong>
          {hasEventBreakdown ? (
            <small className="muted">
              {confirmed != null
                ? `${t('admin.academicCalendars.summary.confirmedEvents')}: ${confirmed}`
                : ''}
              {confirmed != null && provisional != null ? ' · ' : ''}
              {provisional != null
                ? `${t('admin.academicCalendars.summary.provisionalEvents')}: ${provisional}`
                : ''}
            </small>
          ) : null}
        </div>
      ) : null}
    </section>,
    portalTarget,
  );
}
