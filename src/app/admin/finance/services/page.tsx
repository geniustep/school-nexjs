'use client';

import Link from 'next/link';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { ServicesTariffsPanel } from '@/features/admin/finance/services-tariffs-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewFinanceServices } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';

export default function AdminFinanceServicesPage() {
  const t = useT();
  const user = useSession();

  if (!canViewFinanceServices(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.services.title')}
        subtitle={t('admin.finance.services.subtitle')}
      />
      <ServicesTariffsPanel />
    </RequireAdminPermission>
  );
}
