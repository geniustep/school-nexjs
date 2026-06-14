'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { AgreementsListPanel } from '@/features/admin/finance/agreements-list-panel';
import {
  FinanceHubStudentScope,
  useFinanceHubStudentScope,
} from '@/features/admin/finance/finance-hub-student-scope';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewFinanceAgreements } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export default function AdminFinanceAgreementsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const { studentId, setStudentId } = useFinanceHubStudentScope(searchParams, '/admin/finance/agreements');
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/agreements');
  const stateFilter = searchParams.get('state') ?? '';

  if (!canViewFinanceAgreements(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.agreements.title')}
        subtitle={t('admin.finance.agreements.subtitle')}
      />
      <p className="muted">{t('admin.finance.agreements.scopeNote')}</p>
      <FinanceHubStudentScope studentId={studentId} onStudentChange={setStudentId}>
        {(id) => (
          <AgreementsListPanel
            studentId={id}
            returnTo={returnTo}
            initialState={stateFilter || undefined}
          />
        )}
      </FinanceHubStudentScope>
    </RequireAdminPermission>
  );
}
