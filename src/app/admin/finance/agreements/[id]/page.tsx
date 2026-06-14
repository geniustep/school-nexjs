'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { AgreementDetailPanel } from '@/features/admin/finance/agreement-detail-panel';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canViewFinanceAgreements } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export default function AdminFinanceAgreementDetailPage() {
  const t = useT();
  const user = useSession();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const agreementId = Number(params.id);
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/agreements');

  if (!canViewFinanceAgreements(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  if (!Number.isFinite(agreementId)) {
    return <PermissionDeniedState description={t('admin.finance.agreements.notFound')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href={returnTo} className="back-link">
        ‹ {t('admin.finance.agreements.backToList')}
      </Link>
      <PageHeader title={t('admin.finance.agreements.detailTitle')} />
      <AgreementDetailPanel agreementId={agreementId} returnTo={returnTo} />
    </RequireAdminPermission>
  );
}
