'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import '@/features/admin/finance/finance-ui.css';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { ApiErrorView } from '@/components/states/states';
import { EmptyState } from '@/components/states/states';
import { CollectionCreditDrawer } from '@/features/admin/finance/credit-balance/collection-credit-drawer';
import {
  CreditBalanceApplicationsSection,
  CreditBalanceDetailSkeleton,
  CreditBalanceSourcesSection,
  CreditBalanceSummaryCards,
} from '@/features/admin/finance/credit-balance/credit-balance-detail-sections';
import { CreditBalanceStatusBadge } from '@/features/admin/finance/credit-balance/credit-balance-status-badge';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canViewCreditBalances } from '@/lib/permissions/finance';
import { PermissionDeniedState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import {
  creditBalanceDetailErrorMessageKey,
  normalizeBillingAccountCreditDetail,
} from '@/lib/utils/normalize-credit-balance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export default function AdminFinanceBillingAccountCreditBalancePage({
  params,
}: {
  params: Promise<{ billingPartnerId: string }>;
}) {
  const { billingPartnerId } = use(params);
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const returnTo = sanitizeReturnTo(
    searchParams.get('returnTo'),
    '/admin/finance/credit-balances',
  );
  const pageReturnTo = `/admin/finance/billing-accounts/${billingPartnerId}/credit-balance${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const creditState = useAdminResource<unknown>(
    endpoints.admin.financeBillingAccountCreditBalance(billingPartnerId),
  );

  const detail = useMemo(
    () => normalizeBillingAccountCreditDetail(creditState.data),
    [creditState.data],
  );

  const account = detail?.billing_account ?? {
    id: Number(billingPartnerId),
    display_name: `#${billingPartnerId}`,
  };
  const accountName = account.display_name ?? account.name ?? `#${billingPartnerId}`;
  const creditSummary = detail;
  const sources = detail?.sources ?? [];
  const applications = detail?.applications ?? [];
  const currency = detail?.currency;
  const lifecycle = detail?.lifecycle_state ?? 'empty';

  const gross = creditSummary?.gross_unallocated_amount ?? 0;
  const hasUnallocated = gross > 0;
  const allBlocked =
    hasUnallocated &&
    (creditSummary?.available_credit_amount ?? 0) <= 0 &&
    (creditSummary?.blocked_unallocated_amount ?? 0) > 0;

  if (!canViewCreditBalances(user)) {
    return <PermissionDeniedState description={t('admin.pageForbidden')} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href={returnTo} className="back-link">
        ‹ {t('admin.finance.creditBalances.backToList')}
      </Link>
      <Link
        href={`/admin/finance/billing-accounts/${billingPartnerId}?returnTo=${encodeURIComponent(pageReturnTo)}`}
        className="back-link"
      >
        ‹ {t('admin.finance.creditBalances.backToAccount')}
      </Link>

      <PageHeader
        title={t('admin.finance.creditBalances.detailTitle')}
        subtitle={accountName}
      />

      <div className="finance-billing-detail-header card">
        <div className="finance-billing-detail-header__main">
          <h1 dir="auto">{accountName}</h1>
          {account.reference ? <p className="mono muted">{account.reference}</p> : null}
          <div className="finance-billing-detail-header__meta muted">
            {detail?.student_count != null ? (
              <span>
                {t('admin.finance.billingAccounts.studentCountLabel', {
                  count: String(detail.student_count),
                })}
              </span>
            ) : null}
            {activeSchool ? (
              <span dir="auto">
                {t('admin.finance.activeSchool')}: {activeSchool.name}
              </span>
            ) : null}
            <CreditBalanceStatusBadge state={lifecycle} />
          </div>
        </div>
      </div>

      {creditState.initialLoading ? <CreditBalanceDetailSkeleton /> : null}

      {creditState.error && !detail ? (
        <ApiErrorView
          error={{
            code: creditState.error.code ?? 'server_error',
            message: t(creditBalanceDetailErrorMessageKey(creditState.error.code)),
          }}
          onRetry={creditState.reload}
        />
      ) : null}

      {detail && !creditState.initialLoading ? (
        <>
          {allBlocked ? (
            <p className="finance-credit-notice" role="status">
              {t('admin.finance.creditBalances.noticeAccountBlockedOnly')}
            </p>
          ) : null}
          {(detail.available_credit_amount ?? 0) <= 0 ? (
            <p className="finance-credit-notice finance-credit-notice--muted" role="status">
              {t('admin.finance.creditBalances.noticeNoAvailable')}
            </p>
          ) : null}

          <CreditBalanceSummaryCards summary={detail} currency={currency} loading={false} />

          {!hasUnallocated ? (
            <EmptyState
              title={t('admin.finance.creditBalances.emptyAccountTitle')}
              description={t('admin.finance.creditBalances.emptyAccountDesc')}
            />
          ) : (
            <>
              <CreditBalanceSourcesSection
                sources={sources}
                returnTo={pageReturnTo}
                loading={false}
                onOpenSource={setSelectedCollectionId}
              />
              <CreditBalanceApplicationsSection applications={applications} currency={currency} />
            </>
          )}
        </>
      ) : null}

      <CollectionCreditDrawer
        open={selectedCollectionId != null}
        collectionId={selectedCollectionId}
        returnTo={pageReturnTo}
        onClose={() => setSelectedCollectionId(null)}
        onApplied={creditState.reload}
      />
    </RequireAdminPermission>
  );
}
