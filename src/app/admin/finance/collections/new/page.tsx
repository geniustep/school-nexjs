'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceCollectionForm } from '@/features/admin/finance/collection-form';
import { BillingAccountCollectionContext } from '@/features/admin/finance/billing-account-collection-context';
import {
  readCollectionNewParams,
  shouldUseBillingAccountStudentSelector,
} from '@/features/admin/finance/billing-account-collection-selection';
import '@/features/admin/finance/finance-ui.css';
import './collection-new-page.css';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { PermissionDeniedState } from '@/components/states/states';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';

function resolveBackLabel(returnTo: string, t: (key: string) => string): string {
  if (/\/admin\/finance\/cheques\/\d+/.test(returnTo)) return t('admin.finance.collections.backToChequeDetails');
  if (returnTo.includes('/students/')) return t('common.back');
  if (returnTo === '/admin/finance') return t('admin.finance.backToFinance');
  return t('admin.finance.backToCollections');
}

export default function AdminFinanceCollectionNewPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = readCollectionNewParams(searchParams);
  const { studentId, billingPartnerId, academicYearId } = params;
  const returnTo = sanitizeReturnTo(params.returnTo, '/admin/finance/collections');
  const useAccountSelector = shouldUseBillingAccountStudentSelector(params);

  if (!canCollectPayments(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <main className="finance-collection-new-shell">
        <header className="finance-collection-new-header">
          <Link href={returnTo} className="back-link finance-collection-new-header__back">
            ‹ {resolveBackLabel(returnTo, t)}
          </Link>

          <div className="finance-collection-new-header__title">
            <PageHeader
              title={t('admin.finance.recordCollection')}
              subtitle={t('admin.finance.recordCollectionDesc')}
            />
          </div>
        </header>

        <div className="finance-collection-new-page">
          {useAccountSelector ? (
            <BillingAccountCollectionContext
              billingPartnerId={billingPartnerId}
              academicYearId={academicYearId || undefined}
              onDone={(id) =>
                router.push(appendReturnTo(`/admin/finance/collections/${id}`, returnTo))
              }
              onCancel={() => router.push(returnTo)}
            />
          ) : (
            <FinanceCollectionForm
              initialStudentId={studentId || undefined}
              initialBillingPartnerId={billingPartnerId || undefined}
              initialAcademicYearId={academicYearId || undefined}
              lockStudent={!!studentId}
              onDone={(id) =>
                router.push(appendReturnTo(`/admin/finance/collections/${id}`, returnTo))
              }
              onCancel={() => router.push(returnTo)}
            />
          )}
        </div>
      </main>
    </RequireAdminPermission>
  );
}
