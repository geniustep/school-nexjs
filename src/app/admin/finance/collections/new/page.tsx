'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceCollectionForm } from '@/features/admin/finance/collection-form';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { PermissionDeniedState } from '@/components/states/states';

export default function AdminFinanceCollectionNewPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();

  if (!canCollectPayments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/collections" className="back-link">
        ‹ {t('admin.finance.backToCollections')}
      </Link>
      <PageHeader title={t('admin.finance.recordCollection')} subtitle={t('admin.finance.recordCollectionDesc')} />
      <FinanceCollectionForm
        onDone={(id) => router.push(`/admin/finance/collections/${id}`)}
        onCancel={() => router.push('/admin/finance/collections')}
      />
    </RequireAdminPermission>
  );
}
