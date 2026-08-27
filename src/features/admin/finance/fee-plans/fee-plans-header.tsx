'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { getFeeSetupFacadeCopy } from './fee-setup-facade-copy';

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
  const { locale } = useLocale();
  const copy = getFeeSetupFacadeCopy(locale);

  return (
    <header className="fee-plans-workspace__header">
      <div className="fee-plans-workspace__header-main">
        <h1 className="fee-plans-workspace__title">{copy.workspaceTitle}</h1>
        <p className="fee-plans-workspace__subtitle">{copy.workspaceDescription}</p>
      </div>
      {canManage || canManageCatalog ? (
        <div className="fee-plans-workspace__header-actions">
          {canManageCatalog ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onManageCatalog}>
              {copy.manageServices}
            </button>
          ) : null}
          {canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
              {copy.addSetup}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
