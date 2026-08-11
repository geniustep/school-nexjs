'use client';

import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import type { FeePlan } from '@/types/finance';
import type { ListParams } from '@/types/api';

const KPI_STATES = ['', 'confirmed', 'draft', 'archived'] as const;

function useFeePlanCount(params?: ListParams) {
  const state = useGlobalAcademicYearResource<FeePlan[]>(endpoints.admin.financeFeePlans, {
    page: 1,
    page_size: 1,
    ...params,
  });
  return {
    count: state.meta?.pagination?.total ?? null,
    loading: state.loading,
  };
}

export function FeePlansMetrics({
  activeStateFilter,
  onStateFilterChange,
}: {
  activeStateFilter: string;
  onStateFilterChange: (state: string) => void;
}) {
  const t = useT();
  const total = useFeePlanCount();
  const confirmed = useFeePlanCount({ state: 'confirmed' });
  const draft = useFeePlanCount({ state: 'draft' });
  const archived = useFeePlanCount({ state: 'archived' });

  const items = [
    {
      key: 'total',
      state: '',
      label: t('admin.finance.feePlansWorkspace.metrics.total'),
      value: total.count,
      loading: total.loading,
      modifier: '',
    },
    {
      key: 'confirmed',
      state: 'confirmed',
      label: t('admin.finance.feePlansWorkspace.metrics.confirmed'),
      value: confirmed.count,
      loading: confirmed.loading,
      modifier: 'fee-plans-workspace__kpi--confirmed',
    },
    {
      key: 'draft',
      state: 'draft',
      label: t('admin.finance.feePlansWorkspace.metrics.draft'),
      value: draft.count,
      loading: draft.loading,
      modifier: 'fee-plans-workspace__kpi--draft',
    },
    {
      key: 'archived',
      state: 'archived',
      label: t('admin.finance.feePlansWorkspace.metrics.archived'),
      value: archived.count,
      loading: archived.loading,
      modifier: 'fee-plans-workspace__kpi--archived',
    },
  ].filter((item) => item.value != null || item.loading);

  if (!items.length) return null;

  return (
    <div
      className="fee-plans-workspace__metrics"
      data-testid="fee-plans-metrics"
      role="group"
      aria-label={t('academic.status')}
    >
      {items.map((item) => {
        const isActive =
          item.state === ''
            ? activeStateFilter === ''
            : activeStateFilter === item.state;
        return (
          <button
            key={item.key}
            type="button"
            className={`fee-plans-workspace__kpi${item.modifier ? ` ${item.modifier}` : ''}${
              isActive ? ' is-active' : ''
            }`}
            aria-pressed={isActive}
            onClick={() => onStateFilterChange(item.state)}
          >
            <span className="fee-plans-workspace__kpi-label">{item.label}</span>
            <span className="fee-plans-workspace__kpi-value">
              {item.loading ? <span className="fee-plans-workspace__kpi-skeleton" /> : item.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
