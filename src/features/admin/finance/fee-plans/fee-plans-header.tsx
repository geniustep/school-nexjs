'use client';

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
    <header className="fee-plans-workspace__header">
      <div className="fee-plans-workspace__header-main">
        <h1 className="fee-plans-workspace__title">{t('admin.finance.feePlansTitle')}</h1>
        <p className="fee-plans-workspace__subtitle">
          {t('admin.finance.feePlansWorkspace.pageDesc')}
        </p>
      </div>
      {canManage || canManageCatalog ? (
        <div className="fee-plans-workspace__header-actions">
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
      ) : null}
    </header>
  );
}
