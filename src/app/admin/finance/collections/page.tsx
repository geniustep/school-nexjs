'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { CollectionsListPanel } from '@/features/admin/finance/collections-list-panel';
import { useFinanceJournalsAvailable } from '@/features/admin/finance/use-finance-lookups';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS, canCollectPayments } from '@/lib/permissions/finance';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import '@/features/admin/finance/finance-ui.css';

export default function AdminFinanceCollectionsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const studentIdFilter = searchParams.get('student_id') ?? searchParams.get('studentId') ?? '';
  const billingPartnerIdFilter = searchParams.get('billing_partner_id') ?? '';
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/collections');
  const { available: journalsAvailable } = useFinanceJournalsAvailable();

  const newCollectionHref = appendReturnTo(
    studentIdFilter
      ? `/admin/finance/collections/new?studentId=${studentIdFilter}`
      : '/admin/finance/collections/new',
    returnTo,
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href={returnTo === '/admin/finance/collections' ? '/admin/finance' : returnTo} className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.collectionsTitle')}
        subtitle={t('admin.finance.collectionsDesc')}
        actions={
          canCollectPayments(user) && journalsAvailable ? (
            <Link href={newCollectionHref} className="btn btn--primary btn--sm">
              {t('admin.finance.recordCollection')}
            </Link>
          ) : undefined
        }
      />
      <CollectionsListPanel
        studentIdFilter={studentIdFilter}
        billingPartnerIdFilter={billingPartnerIdFilter}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
