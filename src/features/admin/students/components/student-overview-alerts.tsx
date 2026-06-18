'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentOverviewAlert } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';

/** Map common backend alert strings to i18n keys (display only — no API change). */
const ALERT_TEXT_KEYS: Record<string, string> = {
  'missing guardian': 'admin.student360.overview.alerts.known.missingGuardian',
  'missing photo': 'admin.student360.overview.alerts.known.missingPhoto',
  'missing required documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'missing documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'external photo publishing not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'photo publish not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'trip consent pending': 'admin.student360.overview.alerts.known.tripConsentPending',
  'finance overdue': 'admin.student360.overview.alerts.known.financeOverdue',
  'overdue balance': 'admin.student360.overview.alerts.known.financeOverdue',
  'add guardian': 'admin.student360.overview.alerts.actions.addGuardian',
  'view documents': 'admin.student360.overview.alerts.actions.viewDocuments',
  'view guardians': 'admin.student360.overview.alerts.actions.viewGuardians',
};

function localizeOverviewAlertText(t: (key: string) => string, text: string | null | undefined): string {
  if (!text?.trim()) return '';
  const normalized = text.trim().toLowerCase();
  const key = ALERT_TEXT_KEYS[normalized];
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return text.trim();
}

function alertToneClass(severity: string): string {
  if (severity === 'danger' || severity === 'error') return 'student-overview-alert--danger';
  if (severity === 'warning' || severity === 'warn') return 'student-overview-alert--warning';
  if (severity === 'success') return 'student-overview-alert--success';
  return 'student-overview-alert--info';
}

function severityLabel(t: (key: string) => string, severity: string): string {
  if (severity === 'danger' || severity === 'error') return t('admin.student360.overview.alerts.severity.danger');
  if (severity === 'warning' || severity === 'warn') return t('admin.student360.overview.alerts.severity.warning');
  if (severity === 'success') return t('admin.student360.overview.alerts.severity.success');
  return t('admin.student360.overview.alerts.severity.info');
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
      <header className="student-overview-alerts__head">
        <h2 className="student-overview-alerts__title">{t('admin.student360.overview.alerts.title')}</h2>
        <span className="student-overview-alerts__count">{alerts.length}</span>
      </header>
      <ul className="student-overview-alerts__list">
        {alerts.map((alert, index) => {
          const title = localizeOverviewAlertText(t, alert.title);
          const message = alert.message ? localizeOverviewAlertText(t, alert.message) : null;
          const actionLabel = alert.action?.label
            ? localizeOverviewAlertText(t, alert.action.label)
            : null;

          return (
            <li
              key={`${alert.title}-${index}`}
              className={`student-overview-alert ${alertToneClass(alert.severity)}`}
              role="status"
            >
              <div className="student-overview-alert__leading" aria-hidden="true">
                <span className={`student-overview-alert__severity student-overview-alert__severity--${alert.severity}`}>
                  {severityLabel(t, alert.severity)}
                </span>
              </div>
              <div className="student-overview-alert__body">
                <p className="student-overview-alert__title">{title}</p>
                {message ? <p className="student-overview-alert__message">{message}</p> : null}
              </div>
              {actionLabel && alert.action?.tab && onOpenTab ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm student-overview-alert__action"
                  onClick={() => onOpenTab(alert.action!.tab as Student360TabId)}
                >
                  {actionLabel}
                </button>
              ) : actionLabel && alert.action?.url ? (
                <a href={alert.action.url} className="btn btn--ghost btn--sm student-overview-alert__action">
                  {actionLabel}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
