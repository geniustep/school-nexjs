'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentOverviewAlert, StudentOverviewAlertAction } from '@/types/student-overview';
import type { Student360TabId } from '../utils/student-360-tabs';

const ALERT_CODE_KEYS: Record<string, { title: string; message?: string }> = {
  missing_photo: {
    title: 'admin.student360.overview.alerts.known.missingPhoto',
    message: 'admin.student360.overview.alerts.messages.missingPhoto',
  },
  missing_required_documents: {
    title: 'admin.student360.overview.alerts.known.missingDocuments',
    message: 'admin.student360.overview.alerts.messages.missingDocuments',
  },
  missing_guardian: {
    title: 'admin.student360.overview.alerts.known.missingGuardian',
    message: 'admin.student360.overview.alerts.messages.missingGuardian',
  },
  photo_publish_blocked: {
    title: 'admin.student360.overview.alerts.known.photoPublishBlocked',
    message: 'admin.student360.overview.alerts.messages.photoPublishBlocked',
  },
  trip_consent_pending: {
    title: 'admin.student360.overview.alerts.known.tripConsentPending',
    message: 'admin.student360.overview.alerts.messages.tripConsentPending',
  },
  finance_overdue: {
    title: 'admin.student360.overview.alerts.known.financeOverdue',
    message: 'admin.student360.overview.alerts.messages.financeOverdue',
  },
};

const ALERT_TEXT_KEYS: Record<string, string> = {
  missing_guardian: 'admin.student360.overview.alerts.known.missingGuardian',
  'missing guardian': 'admin.student360.overview.alerts.known.missingGuardian',
  'missing photo': 'admin.student360.overview.alerts.known.missingPhoto',
  'missing required documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'missing documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'external photo publishing not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'photo publish not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'trip consent pending': 'admin.student360.overview.alerts.known.tripConsentPending',
  'finance overdue': 'admin.student360.overview.alerts.known.financeOverdue',
  'overdue balance': 'admin.student360.overview.alerts.known.financeOverdue',
  'no student photo is on file.': 'admin.student360.overview.alerts.messages.missingPhoto',
  'one or more required documents are missing.': 'admin.student360.overview.alerts.messages.missingDocuments',
};

const ALERT_ACTION_KEYS: Record<string, { label: string; tab?: Student360TabId }> = {
  upload_photo: {
    label: 'admin.student360.overview.alerts.actions.uploadPhoto',
    tab: 'documents',
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

export function localizeOverviewAlertField(
  t: (key: string) => string,
  alert: StudentOverviewAlert,
  field: 'title' | 'message',
): string {
  const text = field === 'title' ? alert.title : alert.message;
  if (!text?.trim()) return '';

  const codeKey = alert.code ? ALERT_CODE_KEYS[alert.code] : undefined;
  const mappedKey = field === 'title' ? codeKey?.title : codeKey?.message;
  const translated = translateKey(t, mappedKey);
  if (translated) return translated;

  const normalized = text.trim().toLowerCase();
  const slugFromText = normalized.replace(/\s+/g, '_');
  const codeFromText = ALERT_CODE_KEYS[slugFromText];
  if (codeFromText) {
    const textMappedKey = field === 'title' ? codeFromText.title : codeFromText.message;
    const textTranslated = translateKey(t, textMappedKey);
    if (textTranslated) return textTranslated;
  }

  const fallbackKey = ALERT_TEXT_KEYS[normalized] ?? ALERT_TEXT_KEYS[slugFromText];
  const fallback = translateKey(t, fallbackKey);
  if (fallback) return fallback;

  return text.trim();
}

function resolveAlertAction(
  t: (key: string) => string,
  action: StudentOverviewAlertAction | null | undefined,
): { label: string; tab?: Student360TabId; url?: string } | null {
  if (!action) return null;

  const code = action.code?.trim();
  const mapped = code ? ALERT_ACTION_KEYS[code] : undefined;
  const label =
    translateKey(t, mapped?.label) ??
    translateKey(t, ALERT_TEXT_KEYS[action.label?.trim().toLowerCase() ?? '']) ??
    action.label?.trim() ??
    null;

  if (!label) return null;

  return {
    label,
    tab: (action.tab as Student360TabId | undefined) ?? mapped?.tab,
    url: action.url ?? undefined,
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
              {action?.label && action.tab && onOpenTab ? (
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
