'use client';

import Link from 'next/link';
import { useState } from 'react';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import {
  ServicesTariffsPanel,
  type ServicesTariffsTab,
} from '@/features/admin/finance/services-tariffs-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canManageFeeCatalog, canViewFinanceServices } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';

export default function AdminFinanceServicesPage() {
  const t = useT();
  const user = useSession();
  const [tab, setTab] = useState<ServicesTariffsTab>('services');
  const [showForm, setShowForm] = useState(false);
  const canManage = canManageFeeCatalog(user);

  if (!canViewFinanceServices(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  const addLabel =
    tab === 'services'
      ? t('admin.finance.services.addService')
      : t('admin.finance.services.addTariff');

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.services.title')}
        subtitle={t('admin.finance.services.subtitle')}
        actions={
          canManage ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm ? t('common.cancel') : addLabel}
            </button>
          ) : undefined
        }
      />
      <ServicesTariffsPanel
        tab={tab}
        onTabChange={setTab}
        showForm={showForm}
        onShowFormChange={setShowForm}
        canManage={canManage}
      />
    </RequireAdminPermission>
  );
}
