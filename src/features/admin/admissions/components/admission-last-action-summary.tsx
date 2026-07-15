'use client';

import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import type { AdmissionLastAction } from '@/types/admission';
import {
  formatLastActionSummary,
} from '../utils/admission-last-action-display';
import {
  resolveOperationalActorLabel,
  resolveOperationalResultLabel,
} from '../utils/admission-operational-labels';

export function AdmissionLastActionSummary({
  action,
  showDetails = false,
  layout = 'inline',
}: {
  action?: AdmissionLastAction | null;
  showDetails?: boolean;
  /** `card` = title + description + date on separate lines. */
  layout?: 'inline' | 'card';
}) {
  const t = useT();
  const { formatDateTime, formatDate } = useFormat();
  const summary = formatLastActionSummary(action, {
    formatTime: (value) => {
      try {
        return formatDateTime?.(value) || formatDate(value) || value;
      } catch {
        return value;
      }
    },
    actorLabel: (name) => t('admin.admissions.lastAction.by', { name }),
    resolveResult: (raw) => resolveOperationalResultLabel(raw, t),
    resolveActor: (raw) => resolveOperationalActorLabel(raw, t),
  });

  if (summary.key) {
    if (layout === 'card') {
      return (
        <div
          className="admission-card__activity admission-card__activity--empty"
          data-testid="admission-last-action-summary"
        >
          <span className="admission-card__section-label">
            {t('admin.admissions.lastAction.label')}
          </span>
          <p className="admission-card__activity-empty muted">{t(summary.key)}</p>
        </div>
      );
    }
    return (
      <span className="muted" data-testid="admission-last-action-summary">
        {t(summary.key)}
      </span>
    );
  }

  if (layout === 'card') {
    const whenRaw = summary.occurredAt;
    let whenLabel = '';
    if (whenRaw) {
      try {
        whenLabel = formatDateTime?.(whenRaw) || formatDate(whenRaw) || whenRaw;
      } catch {
        whenLabel = whenRaw;
      }
    }
    const description = [summary.result, summary.actor ? t('admin.admissions.lastAction.by', { name: summary.actor }) : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        className="admission-card__activity"
        data-testid="admission-last-action-summary"
        dir="auto"
      >
        <span className="admission-card__section-label">
          {t('admin.admissions.lastAction.label')}
        </span>
        {description ? (
          <p className="admission-card__activity-text" title={description}>
            {description}
          </p>
        ) : null}
        {whenLabel ? (
          <p className="admission-card__activity-when muted" dir="ltr">
            {whenLabel}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admission-last-action-summary" data-testid="admission-last-action-summary" dir="auto">
      <span>{summary.parts.join(' — ')}</span>
      {showDetails ? (
        <dl className="admission-last-action-summary__details">
          {summary.result ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.result')}</dt>
              <dd>{summary.result}</dd>
            </>
          ) : null}
          {summary.actor ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.actor')}</dt>
              <dd>{t('admin.admissions.lastAction.by', { name: summary.actor })}</dd>
            </>
          ) : null}
          {summary.occurredAt ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.at')}</dt>
              <dd dir="ltr">
                {formatDateTime?.(summary.occurredAt) ||
                  formatDate(summary.occurredAt) ||
                  summary.occurredAt}
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
