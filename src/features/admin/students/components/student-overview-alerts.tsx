'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { StudentOverviewAlert, StudentOverviewAlertAction } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';
import { buildStudentEditPhotoHref } from '../utils/student-edit-tabs';
import {
  dedupeOverviewAlerts,
  localizeOverviewAlertField,
  OVERVIEW_WARNING_TEXT_KEYS,
} from '../utils/student-overview-warning-display';

export { localizeOverviewAlertField } from '../utils/student-overview-warning-display';

const ALERT_ACTION_KEYS: Record<string, { label: string; tab?: Student360TabId; editPhoto?: boolean }> = {
  upload_photo: {
    label: 'admin.student360.overview.alerts.actions.uploadPhoto',
    editPhoto: true,
  },
  view_documents: {
    label: 'admin.student360.overview.alerts.actions.viewDocuments',
    tab: 'documents',
  },
  add_guardian: {
    label: 'admin.student360.overview.alerts.actions.addGuardian',
    tab: 'guardians',
  },
  view_guardians: {
    label: 'admin.student360.overview.alerts.actions.viewGuardians',
    tab: 'guardians',
  },
};

function translateKey(t: (key: string) => string, key: string | undefined): string | null {
  if (!key) return null;
  const label = t(key);
  return label !== key ? label : null;
}

function resolveAlertAction(
  t: (key: string) => string,
  action: StudentOverviewAlertAction | null | undefined,
): { label: string; tab?: Student360TabId; url?: string; editPhoto?: boolean } | null {
  if (!action) return null;

  const code = action.code?.trim();
  const mapped = code ? ALERT_ACTION_KEYS[code] : undefined;
  const label =
    translateKey(t, mapped?.label) ??
    translateKey(t, OVERVIEW_WARNING_TEXT_KEYS[action.label?.trim().toLowerCase() ?? '']) ??
    action.label?.trim() ??
    null;

  if (!label) return null;

  return {
    label,
    tab: (action.tab as Student360TabId | undefined) ?? mapped?.tab,
    url: action.url ?? undefined,
    editPhoto: mapped?.editPhoto,
  };
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
  studentId,
  onOpenTab,
}: {
  alerts: StudentOverviewAlert[];
  studentId?: string | number;
  onOpenTab?: (tab: Student360TabId) => void;
}) {
  const t = useT();
  const visibleAlerts = dedupeOverviewAlerts(alerts);

  if (!visibleAlerts.length) return null;

  return (
    <section className="student-overview-alerts" aria-label={t('admin.student360.overview.alerts.title')}>
      <header className="student-overview-alerts__head">
        <h2 className="student-overview-alerts__title">{t('admin.student360.overview.alerts.title')}</h2>
        <span className="student-overview-alerts__count">{visibleAlerts.length}</span>
      </header>
      <ul className="student-overview-alerts__list">
        {visibleAlerts.map((alert, index) => {
          const title = localizeOverviewAlertField(t, alert, 'title');
          const message = alert.message ? localizeOverviewAlertField(t, alert, 'message') : null;
          const action = resolveAlertAction(t, alert.action);

          return (
            <li
              key={`${alert.code ?? alert.title}-${index}`}
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
              {action?.label && action.editPhoto && studentId != null ? (
                <Link
                  href={buildStudentEditPhotoHref(studentId)}
                  className="btn btn--ghost btn--sm student-overview-alert__action"
                >
                  {action.label}
                </Link>
              ) : action?.label && action.tab && onOpenTab ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm student-overview-alert__action"
                  onClick={() => onOpenTab(action.tab!)}
                >
                  {action.label}
                </button>
              ) : action?.label && action.url ? (
                <a href={action.url} className="btn btn--ghost btn--sm student-overview-alert__action">
                  {action.label}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
