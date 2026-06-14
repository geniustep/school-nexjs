'use client';

import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { FeePlan } from '@/types/finance';
import type { ListParams } from '@/types/api';

function useFeePlanCount(params?: ListParams) {
  const state = useAdminResource<FeePlan[]>(endpoints.admin.financeFeePlans, {
    page: 1,
    page_size: 1,
    ...params,
  });
  return {
    count: state.meta?.pagination?.total ?? null,
    loading: state.loading,
  };
}

export function FeePlansMetrics() {
  const t = useT();
  const total = useFeePlanCount();
  const confirmed = useFeePlanCount({ state: 'confirmed' });
  const draft = useFeePlanCount({ state: 'draft' });
  const archived = useFeePlanCount({ state: 'archived' });

  const items = [
    { key: 'total', label: t('admin.finance.feePlansWorkspace.metrics.total'), value: total.count },
    { key: 'confirmed', label: t('admin.finance.feePlansWorkspace.metrics.confirmed'), value: confirmed.count },
    { key: 'draft', label: t('admin.finance.feePlansWorkspace.metrics.draft'), value: draft.count },
    { key: 'archived', label: t('admin.finance.feePlansWorkspace.metrics.archived'), value: archived.count },
  ].filter((item) => item.value != null);

  if (!items.length) return null;

  return (
    <div className="finance-metrics-grid fee-plans-metrics" data-testid="fee-plans-metrics">
      {items.map((item) => (
        <div key={item.key} className="card finance-metric-card">
          <span className="muted">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
