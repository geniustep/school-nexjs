'use client';

import Link from 'next/link';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { BillingAccountsDataQualityPanel } from '@/features/admin/finance/billing-accounts-data-quality-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewStudentBalance } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';

export default function AdminFinanceBillingAccountsDataQualityPage() {
  const t = useT();
  const user = useSession();

  if (!canViewStudentBalance(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/billing-accounts" className="back-link">
        ‹ {t('admin.finance.billingAccounts.backToList')}
      </Link>
      <PageHeader
        title={t('admin.finance.billingAccounts.dataQuality.title')}
        subtitle={t('admin.finance.billingAccounts.dataQuality.subtitle')}
      />
      <BillingAccountsDataQualityPanel />
    </RequireAdminPermission>
  );
}
