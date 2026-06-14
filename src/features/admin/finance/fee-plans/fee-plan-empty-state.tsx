'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';

export function FeePlanEmptyState({
  variant,
  onAdd,
  onClearFilters,
}: {
  variant: 'no-data' | 'filtered';
  onAdd?: () => void;
  onClearFilters?: () => void;
}) {
  const t = useT();

  if (variant === 'filtered') {
    return (
      <EmptyState
        title={t('admin.finance.feePlansWorkspace.emptyFilteredTitle')}
        description={t('admin.finance.feePlansWorkspace.emptyFilteredDesc')}
        action={
          onClearFilters ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onClearFilters}>
              {t('admin.finance.feePlansWorkspace.clearFilters')}
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      title={t('admin.finance.feePlansWorkspace.emptyTitle')}
      description={t('admin.finance.feePlansWorkspace.emptyDesc')}
      action={
        onAdd ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
            {t('admin.finance.feePlansWorkspace.addPlan')}
          </button>
        ) : undefined
      }
    />
  );
}
