'use client';

import { StatCard } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionsDashboard } from '@/types/admission';
import {
  ADMISSIONS_INFO_INDICATORS,
  ADMISSIONS_OPERATIONAL_CARDS,
  resolveOperationalCardPressed,
  type AdmissionsOperationalCardId,
} from '../utils/admissions-dashboard-cards';

export function AdmissionsDashboardSummary({
  data,
  activeOperationalCard = null,
  onOperationalCardClick,
}: {
  data: AdmissionsDashboard;
  activeOperationalCard?: AdmissionsOperationalCardId | null;
  onOperationalCardClick?: (card: AdmissionsOperationalCardId) => void;
}) {
  const t = useT();

  return (
    <div className="admissions-dashboard-stack" data-testid="admissions-dashboard">
      <div
        className="admissions-dashboard admissions-dashboard--main admissions-dashboard--operational"
        role="group"
        aria-label={t('admin.admissions.dashboard.mainGroup')}
        data-testid="admissions-dashboard-main"
      >
        {ADMISSIONS_OPERATIONAL_CARDS.map((card) => {
          const value = Number(data[card.countKey] ?? 0);
          const active = resolveOperationalCardPressed(activeOperationalCard, card.id);
          const label = t(card.labelKey);
          const aria = active
            ? t('admin.admissions.dashboard.clearFilterAria', { label })
            : t(card.ariaFilterKey);

          return (
            <button
              key={card.id}
              type="button"
              className={cn(
                'admissions-dashboard__kpi-btn',
                `admissions-dashboard__kpi-btn--${card.tone}`,
                active && 'admissions-dashboard__kpi-btn--active',
              )}
              aria-pressed={active}
              aria-label={aria}
              title={active ? t('admin.admissions.dashboard.clearFilterHint') : undefined}
              data-testid={`admissions-kpi-${card.id}`}
              data-interactive="true"
              data-count-key={card.countKey}
              onClick={() => onOperationalCardClick?.(card.id)}
            >
              <StatCard label={label} value={value} tone={card.tone} />
              {card.hintKey ? (
                <span className="admissions-dashboard__kpi-hint">{t(card.hintKey)}</span>
              ) : null}
              {active ? (
                <span className="admissions-dashboard__kpi-clear" aria-hidden="true">
                  ×
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        className="admissions-dashboard admissions-dashboard--info"
        role="group"
        aria-label={t('admin.admissions.dashboard.infoGroup')}
        data-testid="admissions-dashboard-info"
      >
        {ADMISSIONS_INFO_INDICATORS.map((item) => {
          const value = Number(data[item.countKey] ?? 0);
          return (
            <div
              key={item.id}
              className="admissions-dashboard__indicator admissions-dashboard__indicator--info"
              data-testid={`admissions-indicator-${item.id}`}
              data-interactive="false"
            >
              <span className="admissions-dashboard__indicator-label">{t(item.labelKey)}</span>
              <span className="admissions-dashboard__indicator-value">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
