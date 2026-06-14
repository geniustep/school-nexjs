'use client';

import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

export function FeePlansHeader({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) {
  const t = useT();

  return (
    <PageHeader
      title={t('admin.finance.feePlansTitle')}
      subtitle={t('admin.finance.feePlansWorkspace.pageDesc')}
      actions={
        canManage ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
            {t('admin.finance.feePlansWorkspace.addPlan')}
          </button>
        ) : undefined
      }
    />
  );
}
