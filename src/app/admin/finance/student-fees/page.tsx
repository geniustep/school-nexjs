'use client';

import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceStudentSearchPage } from '@/features/admin/finance/finance-student-search';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewStudentBalance } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';

export default function AdminFinanceStudentFeesPage() {
  const t = useT();
  const user = useSession();
  const canSearch = canViewStudentBalance(user);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={t('admin.finance.studentFeesTitle')} subtitle={t('admin.finance.studentFeesDesc')} />

      {canSearch ? (
        <div className="card">
          <FinanceStudentSearchPage />
        </div>
      ) : (
        <p className="muted">{t('admin.finance.studentSearchForbidden')}</p>
      )}
    </RequireAdminPermission>
  );
}
