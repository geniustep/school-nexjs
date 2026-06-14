'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { InstallmentsListPanel } from '@/features/admin/finance/installments-list-panel';
import {
  FinanceHubStudentScope,
  useFinanceHubStudentScope,
} from '@/features/admin/finance/finance-hub-student-scope';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewFinanceInstallments } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export default function AdminFinanceInstallmentsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const { studentId, setStudentId } = useFinanceHubStudentScope(searchParams, '/admin/finance/installments');
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/installments');
  const quick = (searchParams.get('quick') ?? '') as
    | ''
    | 'overdue_unpaid'
    | 'partially_paid'
    | 'due_today'
    | 'due_7_days'
    | 'hidden';

  if (!canViewFinanceInstallments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.installments.title')}
        subtitle={t('admin.finance.installments.subtitle')}
      />
      <p className="muted">{t('admin.finance.installments.scopeNote')}</p>
      <FinanceHubStudentScope studentId={studentId} onStudentChange={setStudentId}>
        {({ studentId: id }) => (
          <InstallmentsListPanel studentId={id} returnTo={returnTo} initialQuick={quick || undefined} />
        )}
      </FinanceHubStudentScope>
    </RequireAdminPermission>
  );
}
