'use client';

import { EmptyState } from '@/components/states/states';
import { useLocale } from '@/features/i18n/locale-context';
import { getFeeSetupFacadeCopy } from './fee-setup-facade-copy';

export function FeePlanEmptyState({
  variant,
  onAdd,
  onClearFilters,
}: {
  variant: 'no-data' | 'no-match' | 'filtered';
  onAdd?: () => void;
  onClearFilters?: () => void;
}) {
  const { locale } = useLocale();
  const copy = getFeeSetupFacadeCopy(locale);

  if (variant === 'no-match' || variant === 'filtered') {
    return (
      <div className="fee-plans-workspace__empty">
        <div className="fee-plans-workspace__empty-icon" aria-hidden>
          🔎
        </div>
        <EmptyState
          title={copy.noMatchTitle}
          description={copy.noMatchDescription}
          action={
            onClearFilters ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={onClearFilters}>
                {locale === 'ar' ? 'مسح المرشحات' : locale === 'fr' ? 'Effacer les filtres' : locale === 'es' ? 'Borrar filtros' : 'Clear filters'}
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
        title={copy.emptyTitle}
        description={copy.emptyDescription}
        action={
          onAdd ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
              {copy.addSetup}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
