'use client';

import { StatCard } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionsDashboard } from '@/types/admission';

export function AdmissionsDashboardSummary({ data }: { data: AdmissionsDashboard }) {
  const t = useT();
  const items: { key: keyof AdmissionsDashboard; tone?: 'green' | 'amber' | 'blue' | 'red' | 'slate' }[] = [
    { key: 'total_open', tone: 'blue' },
    { key: 'new_count' },
    { key: 'visit_pending_count', tone: 'amber' },
    { key: 'under_review_count', tone: 'amber' },
    { key: 'accepted_count', tone: 'green' },
    { key: 'offer_sent_count', tone: 'blue' },
    { key: 'confirmed_count', tone: 'green' },
    { key: 'lost_count', tone: 'red' },
    { key: 'today_appointments', tone: 'blue' },
    { key: 'overdue_next_actions', tone: 'red' },
  ];

  return (
    <div className="admissions-dashboard">
      {items.map(({ key, tone }) => (
        <StatCard
          key={key}
          label={t(`admin.admissions.dashboard.${key}`)}
          value={data[key] ?? 0}
          tone={tone ?? 'slate'}
        />
      ))}
    </div>
  );
}
