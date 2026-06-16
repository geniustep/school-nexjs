'use client';

import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

export function FeePlansHeader({
  canManage,
  canManageCatalog,
  onAdd,
  onManageCatalog,
}: {
  canManage: boolean;
  canManageCatalog: boolean;
  onAdd: () => void;
  onManageCatalog: () => void;
}) {
  const t = useT();

  return (
    <PageHeader
      title={t('admin.finance.feePlansTitle')}
      subtitle={t('admin.finance.feePlansWorkspace.pageDesc')}
      actions={
        canManage || canManageCatalog ? (
          <div className="fee-plans-header__actions row">
            {canManageCatalog ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onManageCatalog}>
                {t('admin.finance.feePlansWorkspace.manageFeeTypes')}
              </button>
            ) : null}
            {canManage ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
                {t('admin.finance.feePlansWorkspace.addPlan')}
              </button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
