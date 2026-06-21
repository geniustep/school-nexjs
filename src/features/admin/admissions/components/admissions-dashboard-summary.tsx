'use client';

import { StatCard } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionsDashboard } from '@/types/admission';

type DashboardKey = keyof AdmissionsDashboard;

/** Core daily KPIs only — pipeline stages live in Kanban columns. */
const DASHBOARD_ITEMS: {
  key: DashboardKey;
  tone: 'blue' | 'amber' | 'red';
  filterable?: boolean;
}[] = [
  { key: 'total_open', tone: 'blue', filterable: true },
  { key: 'new_count', tone: 'blue' },
  { key: 'today_appointments', tone: 'amber' },
  { key: 'overdue_next_actions', tone: 'red' },
  { key: 'lost_count', tone: 'red', filterable: true },
];

export function AdmissionsDashboardSummary({
  data,
  onKpiClick,
}: {
  data: AdmissionsDashboard;
  onKpiClick?: (key: DashboardKey) => void;
}) {
  const t = useT();

  return (
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
              className={cn('admissions-dashboard__kpi-btn', `admissions-dashboard__kpi-btn--${tone}`)}
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
  );
}
