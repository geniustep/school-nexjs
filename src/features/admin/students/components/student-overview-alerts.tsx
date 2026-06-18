'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentOverviewAlert } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';

function alertToneClass(severity: string): string {
  if (severity === 'danger' || severity === 'error') return 'student-overview-alert--danger';
  if (severity === 'warning' || severity === 'warn') return 'student-overview-alert--warning';
  if (severity === 'success') return 'student-overview-alert--success';
  return 'student-overview-alert--info';
}

export function StudentOverviewAlerts({
  alerts,
  onOpenTab,
}: {
  alerts: StudentOverviewAlert[];
  onOpenTab?: (tab: Student360TabId) => void;
}) {
  const t = useT();

  if (!alerts.length) return null;

  return (
    <section className="student-overview-alerts" aria-label={t('admin.student360.overview.alerts.title')}>
      <ul className="student-overview-alerts__list">
        {alerts.map((alert, index) => (
          <li
            key={`${alert.title}-${index}`}
            className={`student-overview-alert ${alertToneClass(alert.severity)}`}
            role="status"
          >
            <div className="student-overview-alert__body">
              <p className="student-overview-alert__title">{alert.title}</p>
              {alert.message ? <p className="student-overview-alert__message">{alert.message}</p> : null}
            </div>
            {alert.action?.label && alert.action.tab && onOpenTab ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm student-overview-alert__action"
                onClick={() => onOpenTab(alert.action!.tab as Student360TabId)}
              >
                {alert.action.label}
              </button>
            ) : alert.action?.label && alert.action.url ? (
              <a href={alert.action.url} className="btn btn--ghost btn--sm student-overview-alert__action">
                {alert.action.label}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
