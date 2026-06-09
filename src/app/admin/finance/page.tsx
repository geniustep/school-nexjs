'use client';

import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceHubLinks } from '@/features/admin/finance/finance-hub-links';
import { FinanceOverviewPanel } from '@/features/admin/finance/finance-overview-panel';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW } from '@/lib/permissions/finance';

export default function AdminFinancePage() {
  const t = useT();
  const { activeSchoolId, schools } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <PageHeader title={t('admin.finance.title')} subtitle={t('admin.finance.hubSubtitle')} />

      {activeSchool && (
        <p className="muted finance-context-line">
          {t('admin.finance.activeSchool')}: <strong>{activeSchool.name}</strong>
        </p>
      )}

      <FinanceOverviewPanel />
      <FinanceHubLinks />
    </RequireAdminPermission>
  );
}
