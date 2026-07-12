'use client';

import { StatCard } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionsDashboard } from '@/types/admission';
import type { AdmissionOutcomeFilter } from '../utils/admission-status-display';
import {
  ADMISSIONS_MAIN_DASHBOARD_CARDS,
  resolveDashboardOutcomeClick,
  shouldShowOfferIndicator,
} from '../utils/admissions-dashboard-cards';

export function AdmissionsDashboardSummary({
  data,
  activeOutcomeFilter = '',
  onOutcomeFilterClick,
  onNewFilterClick,
}: {
  data: AdmissionsDashboard;
  activeOutcomeFilter?: AdmissionOutcomeFilter;
  onOutcomeFilterClick?: (filter: AdmissionOutcomeFilter) => void;
  onNewFilterClick?: () => void;
}) {
  const t = useT();
  const familyDeclined = Number(data.family_declined_count ?? 0);
  const expiredOffer = Number(data.expired_offer_count ?? 0);
  const newCount = Number(data.new_count ?? 0);
  const overdue = Number(data.overdue_next_actions ?? 0);
  const todayAppointments = Number(data.today_appointments ?? 0);

  return (
    <div className="admissions-dashboard-stack" data-testid="admissions-dashboard">
      <div
        className="admissions-dashboard admissions-dashboard--main"
        role="group"
        aria-label={t('admin.admissions.dashboard.mainGroup')}
        data-testid="admissions-dashboard-main"
      >
        {ADMISSIONS_MAIN_DASHBOARD_CARDS.map((card) => {
          const value = Number(data[card.countKey] ?? 0);
          const active = Boolean(card.filter && activeOutcomeFilter === card.filter);
          const label = t(card.labelKey);
          const aria =
            card.ariaFilterKey != null ? t(card.ariaFilterKey) : label;

          if (!card.interactive || !card.filter) {
            return (
              <div
                key={card.id}
                className={cn(
                  'admissions-dashboard__kpi',
                  'admissions-dashboard__kpi--info',
                )}
                data-testid={`admissions-kpi-${card.id}`}
                data-interactive="false"
              >
                <StatCard label={label} value={value} tone={card.tone} />
              </div>
            );
          }

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
              data-testid={`admissions-kpi-${card.id}`}
              data-interactive="true"
              data-count-key={card.countKey}
              onClick={() =>
                onOutcomeFilterClick?.(
                  resolveDashboardOutcomeClick(activeOutcomeFilter, card.filter!),
                )
              }
            >
              <StatCard label={label} value={value} tone={card.tone} />
              {card.hintKey ? (
                <span className="admissions-dashboard__kpi-hint">{t(card.hintKey)}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        className="admissions-dashboard admissions-dashboard--secondary"
        role="group"
        aria-label={t('admin.admissions.dashboard.secondaryGroup')}
        data-testid="admissions-dashboard-secondary"
      >
        <button
          type="button"
          className={cn(
            'admissions-dashboard__indicator',
            'admissions-dashboard__indicator--clickable',
          )}
          aria-label={t('admin.admissions.dashboard.filterNewAria')}
          data-testid="admissions-indicator-new"
          onClick={() => onNewFilterClick?.()}
        >
          <span className="admissions-dashboard__indicator-label">
            {t('admin.admissions.dashboard.new_count')}
          </span>
          <span className="admissions-dashboard__indicator-value">{newCount}</span>
        </button>

        <div
          className="admissions-dashboard__indicator admissions-dashboard__indicator--info"
          data-testid="admissions-indicator-overdue"
          data-interactive="false"
        >
          <span className="admissions-dashboard__indicator-label">
            {t('admin.admissions.dashboard.overdue_next_actions')}
          </span>
          <span className="admissions-dashboard__indicator-value">{overdue}</span>
        </div>

        <div
          className="admissions-dashboard__indicator admissions-dashboard__indicator--info"
          data-testid="admissions-indicator-today"
          data-interactive="false"
        >
          <span className="admissions-dashboard__indicator-label">
            {t('admin.admissions.dashboard.today_appointments')}
          </span>
          <span className="admissions-dashboard__indicator-value">{todayAppointments}</span>
        </div>

        {shouldShowOfferIndicator(familyDeclined) ? (
          <button
            type="button"
            className={cn(
              'admissions-dashboard__indicator',
              'admissions-dashboard__indicator--clickable',
              activeOutcomeFilter === 'family_declined' &&
                'admissions-dashboard__indicator--active',
            )}
            aria-pressed={activeOutcomeFilter === 'family_declined'}
            aria-label={t('admin.admissions.offerStates.familyDeclined')}
            data-testid="admissions-indicator-declined"
            onClick={() =>
              onOutcomeFilterClick?.(
                resolveDashboardOutcomeClick(activeOutcomeFilter, 'family_declined'),
              )
            }
          >
            <span className="admissions-dashboard__indicator-label">
              {t('admin.admissions.offerStates.familyDeclined')}
            </span>
            <span className="admissions-dashboard__indicator-value">{familyDeclined}</span>
          </button>
        ) : null}

        {shouldShowOfferIndicator(expiredOffer) ? (
          <button
            type="button"
            className={cn(
              'admissions-dashboard__indicator',
              'admissions-dashboard__indicator--clickable',
              activeOutcomeFilter === 'expired_offer' &&
                'admissions-dashboard__indicator--active',
            )}
            aria-pressed={activeOutcomeFilter === 'expired_offer'}
            aria-label={t('admin.admissions.offerStates.familyExpired')}
            data-testid="admissions-indicator-expired"
            onClick={() =>
              onOutcomeFilterClick?.(
                resolveDashboardOutcomeClick(activeOutcomeFilter, 'expired_offer'),
              )
            }
          >
            <span className="admissions-dashboard__indicator-label">
              {t('admin.admissions.offerStates.familyExpired')}
            </span>
            <span className="admissions-dashboard__indicator-value">{expiredOffer}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
