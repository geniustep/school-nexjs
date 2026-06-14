'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceCollectionForm } from '@/features/admin/finance/collection-form';
import '@/features/admin/finance/finance-ui.css';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { PermissionDeniedState } from '@/components/states/states';

export default function AdminFinanceCollectionNewPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');

  if (!canCollectPayments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance/collections" className="back-link">
        ‹ {t('admin.finance.backToCollections')}
      </Link>
      <PageHeader title={t('admin.finance.recordCollection')} subtitle={t('admin.finance.recordCollectionDesc')} />
      <FinanceCollectionForm
        initialStudentId={studentId ?? undefined}
        lockStudent={!!studentId}
        onDone={(id) => router.push(`/admin/finance/collections/${id}`)}
        onCancel={() =>
          studentId
            ? router.push(`/admin/students/${studentId}`)
            : router.push('/admin/finance/collections')
        }
      />
    </RequireAdminPermission>
  );
}
