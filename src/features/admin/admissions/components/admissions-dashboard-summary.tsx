'use client';

import { StatCard } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionsDashboard } from '@/types/admission';
import type { AdmissionOutcomeFilter } from '../utils/admission-status-display';

type DashboardKey = keyof AdmissionsDashboard;

/** Core daily KPIs — pipeline stages live in Kanban columns. */
const DASHBOARD_ITEMS: {
  key: DashboardKey;
  tone: 'blue' | 'amber' | 'red' | 'green';
  filterable?: boolean;
}[] = [
  { key: 'total_open', tone: 'blue', filterable: true },
  { key: 'new_count', tone: 'blue' },
  { key: 'overdue_next_actions', tone: 'red' },
  { key: 'today_appointments', tone: 'amber' },
];

/** Outcome cards — values come only from backend dashboard counters. */
const OUTCOME_CARDS: {
  filter: Exclude<AdmissionOutcomeFilter, ''>;
  countKey: DashboardKey;
  tone: 'amber' | 'green' | 'red' | 'blue';
  secondary?: boolean;
}[] = [
  {
    filter: 'awaiting_registration',
    countKey: 'awaiting_registration_count',
    tone: 'amber',
  },
  {
    filter: 'registered',
    countKey: 'registered_count',
    tone: 'green',
  },
  {
    filter: 'school_rejected',
    countKey: 'school_rejected_count',
    tone: 'red',
  },
  {
    filter: 'family_declined',
    countKey: 'family_declined_count',
    tone: 'red',
    secondary: true,
  },
  {
    filter: 'expired_offer',
    countKey: 'expired_offer_count',
    tone: 'amber',
    secondary: true,
  },
];

export function AdmissionsDashboardSummary({
  data,
  onKpiClick,
  activeOutcomeFilter = '',
  onOutcomeFilterClick,
}: {
  data: AdmissionsDashboard;
  onKpiClick?: (key: DashboardKey) => void;
  activeOutcomeFilter?: AdmissionOutcomeFilter;
  onOutcomeFilterClick?: (filter: AdmissionOutcomeFilter) => void;
}) {
  const t = useT();

  return (
    <div className="admissions-dashboard-stack">
      <div className="admissions-dashboard">
        {DASHBOARD_ITEMS.map(({ key, tone, filterable }) => {
          const card = (
            <StatCard
              label={t(`admin.admissions.dashboard.${key}`)}
              value={data[key] ?? 0}
              tone={tone}
            />
          );

          if (filterable && onKpiClick) {
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'admissions-dashboard__kpi-btn',
                  `admissions-dashboard__kpi-btn--${tone}`,
                )}
                onClick={() => onKpiClick(key)}
                aria-label={t(`admin.admissions.dashboard.${key}`)}
              >
                {card}
              </button>
            );
          }

          return (
            <div key={key} className="admissions-dashboard__kpi">
              {card}
            </div>
          );
        })}
      </div>

      <div
        className="admissions-dashboard admissions-dashboard--outcomes"
        role="group"
        aria-label={t('admin.admissions.dashboard.outcomeGroup')}
      >
        {OUTCOME_CARDS.map(({ filter, countKey, tone, secondary }) => {
          const value = Number(data[countKey] ?? 0);
          const active = activeOutcomeFilter === filter;
          const labelKey =
            filter === 'awaiting_registration'
              ? 'admin.admissions.registrationStatus.awaiting_registration'
              : filter === 'registered'
                ? 'admin.admissions.registrationStatus.registered'
                : filter === 'school_rejected'
                  ? 'admin.admissions.schoolDecision.rejected'
                  : filter === 'family_declined'
                    ? 'admin.admissions.offerStates.familyDeclined'
                    : 'admin.admissions.offerStates.familyExpired';

          return (
            <button
              key={filter}
              type="button"
              className={cn(
                'admissions-dashboard__kpi-btn',
                `admissions-dashboard__kpi-btn--${tone}`,
                secondary && 'admissions-dashboard__kpi-btn--secondary',
                active && 'admissions-dashboard__kpi-btn--active',
              )}
              aria-pressed={active}
              onClick={() =>
                onOutcomeFilterClick?.(active ? '' : filter)
              }
              aria-label={t(labelKey)}
            >
              <StatCard label={t(labelKey)} value={value} tone={tone} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
