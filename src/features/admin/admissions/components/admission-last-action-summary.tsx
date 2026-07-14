'use client';

import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import type { AdmissionLastAction } from '@/types/admission';
import { formatLastActionSummary } from '../utils/admission-last-action-display';

export function AdmissionLastActionSummary({
  action,
  showDetails = false,
}: {
  action?: AdmissionLastAction | null;
  showDetails?: boolean;
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
  });

  if (summary.key) {
    return (
      <span className="muted" data-testid="admission-last-action-summary">
        {t(summary.key)}
      </span>
    );
  }

  const result = action?.result_label ?? action?.result ?? action?.label ?? action?.code;
  const actor =
    action?.actor_name ||
    (typeof action?.actor === 'string'
      ? action.actor
      : action?.actor && typeof action.actor === 'object' && 'name' in action.actor
        ? String((action.actor as { name?: string }).name ?? '')
        : '');
  const when = action?.occurred_at ?? action?.at;

  return (
    <div className="admission-last-action-summary" data-testid="admission-last-action-summary" dir="auto">
      <span>{summary.parts.join(' — ')}</span>
      {showDetails ? (
        <dl className="admission-last-action-summary__details">
          {result ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.result')}</dt>
              <dd>{result}</dd>
            </>
          ) : null}
          {actor ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.actor')}</dt>
              <dd>{t('admin.admissions.lastAction.by', { name: actor })}</dd>
            </>
          ) : null}
          {when ? (
            <>
              <dt className="sr-only">{t('admin.admissions.lastAction.at')}</dt>
              <dd dir="ltr">{formatDateTime?.(when) || formatDate(when) || when}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
