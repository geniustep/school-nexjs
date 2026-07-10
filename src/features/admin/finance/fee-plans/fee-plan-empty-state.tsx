'use client';

import { EmptyState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';

export function FeePlanEmptyState({
  variant,
  onAdd,
  onClearFilters,
}: {
  variant: 'no-data' | 'no-match' | 'filtered';
  onAdd?: () => void;
  onClearFilters?: () => void;
}) {
  const t = useT();

  if (variant === 'no-match' || variant === 'filtered') {
    return (
      <div className="fee-plans-workspace__empty">
        <div className="fee-plans-workspace__empty-icon" aria-hidden>
          🔎
        </div>
        <EmptyState
          title={t('admin.finance.feePlansWorkspace.noMatch.title')}
          description={t('admin.finance.feePlansWorkspace.noMatch.description')}
          action={
            onClearFilters ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={onClearFilters}>
                {t('admin.finance.feePlansWorkspace.clearFilters')}
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="fee-plans-workspace__empty">
      <div className="fee-plans-workspace__empty-icon" aria-hidden>
        📋
      </div>
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
    </div>
  );
}
