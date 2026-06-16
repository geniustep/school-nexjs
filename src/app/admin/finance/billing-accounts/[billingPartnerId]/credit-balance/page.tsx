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
import { normalizeBillingAccountSummary } from '@/lib/utils/normalize-billing-account';
import {
  collectionToCreditSourceFallback,
  creditBalanceErrorMessageKey,
  deriveCreditLifecycleState,
  normalizeBillingAccountCreditDetail,
  normalizeCreditBalanceList,
} from '@/lib/utils/normalize-credit-balance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentCollection } from '@/types/finance';
import type { CreditBalanceAmounts, CreditBalanceSource } from '@/types/finance-credit-balance';

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
  const summaryState = useAdminResource<unknown>(
    endpoints.admin.financeBillingAccountSummary(billingPartnerId),
  );
  const collectionsState = useAdminResource<PaymentCollection[]>(
    creditState.error ? endpoints.admin.financePaymentCollections : null,
    creditState.error
      ? { billing_partner_id: billingPartnerId, page: 1, page_size: 50 }
      : undefined,
  );

  const creditDetail = useMemo(
    () => normalizeBillingAccountCreditDetail(creditState.data),
    [creditState.data],
  );
  const detail = creditDetail;
  const familySummary = useMemo(
    () => normalizeBillingAccountSummary(summaryState.data),
    [summaryState.data],
  );

  const fallbackSources = useMemo(() => {
    if (!creditState.error || !collectionsState.data) return [];
    return parseFinanceList<PaymentCollection>(collectionsState.data)
      .map(collectionToCreditSourceFallback)
      .filter((row): row is CreditBalanceSource => row != null);
  }, [creditState.error, collectionsState.data]);

  const creditSummary: CreditBalanceAmounts | null =
    detail ??
    familySummary?.summary.credit ??
    (familySummary?.summary.unallocated_collection_amount != null
      ? {
          gross_unallocated_amount: familySummary.summary.unallocated_collection_amount,
          pending_unallocated_amount: 0,
          available_credit_amount: familySummary.summary.credit?.available_credit_amount ?? 0,
          blocked_unallocated_amount:
            familySummary.summary.credit?.blocked_unallocated_amount ??
            familySummary.summary.unallocated_collection_amount,
          applied_credit_amount: familySummary.summary.credit?.applied_credit_amount ?? 0,
          refundable_credit_amount: familySummary.summary.credit?.refundable_credit_amount ?? 0,
        }
      : null);
  const account =
    detail?.billing_account ??
    familySummary?.billing_account ?? {
      id: Number(billingPartnerId),
      display_name: `#${billingPartnerId}`,
    };
  const sources = detail?.sources?.length ? detail.sources : fallbackSources;
  const currency = detail?.currency ?? familySummary?.summary.currency;
  const lifecycle =
    detail?.lifecycle_state ?? (creditSummary ? deriveCreditLifecycleState(creditSummary) : 'empty');
  const loading = summaryState.initialLoading && !familySummary;
  const accountName = account.display_name ?? account.name ?? `#${billingPartnerId}`;

  const gross =
    creditSummary?.gross_unallocated_amount ?? familySummary?.summary.unallocated_collection_amount;
  const hasUnallocated = (gross ?? 0) > 0;
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
            <span>
              {t('admin.finance.billingAccounts.studentCountLabel', {
                count: String(
                  detail?.student_count ??
                    familySummary?.summary.student_count ??
                    familySummary?.students.length ??
                    0,
                ),
              })}
            </span>
            {activeSchool ? (
              <span dir="auto">
                {t('admin.finance.activeSchool')}: {activeSchool.name}
              </span>
            ) : null}
            <CreditBalanceStatusBadge state={lifecycle} />
          </div>
        </div>
      </div>

      {creditState.error && !detail && !familySummary ? (
        <ApiErrorView
          error={{
            code: creditState.error.code ?? 'server_error',
            message: t(creditBalanceErrorMessageKey(creditState.error.code)),
          }}
          onRetry={() => {
            creditState.reload();
            summaryState.reload();
          }}
        />
      ) : null}

      {creditState.error && !detail && familySummary ? (
        <p className="finance-credit-notice finance-credit-notice--warn" role="status">
          {t('admin.finance.creditBalances.detailFallbackNotice')}
        </p>
      ) : null}

      {loading && !creditSummary ? <CreditBalanceDetailSkeleton /> : null}

      {creditSummary && !loading ? (
        <>
          {allBlocked ? (
            <p className="finance-credit-notice" role="status">
              {t('admin.finance.creditBalances.noticeAccountBlockedOnly')}
            </p>
          ) : null}
          {(creditSummary.available_credit_amount ?? 0) <= 0 ? (
            <p className="finance-credit-notice finance-credit-notice--muted" role="status">
              {t('admin.finance.creditBalances.noticeNoAvailable')}
            </p>
          ) : null}

          <CreditBalanceSummaryCards summary={creditSummary} currency={currency} loading={false} />

          {!hasUnallocated ? (
            <EmptyState
              title={t('admin.finance.creditBalances.emptyAccountTitle')}
              description={t('admin.finance.creditBalances.emptyAccountDesc')}
            />
          ) : (
            <CreditBalanceSourcesSection
              sources={sources}
              returnTo={pageReturnTo}
              loading={false}
              onOpenSource={setSelectedCollectionId}
            />
          )}
        </>
      ) : null}

      <CollectionCreditDrawer
        open={selectedCollectionId != null}
        collectionId={selectedCollectionId}
        returnTo={pageReturnTo}
        onClose={() => setSelectedCollectionId(null)}
        onApplied={() => {
          creditState.reload();
          summaryState.reload();
        }}
      />
    </RequireAdminPermission>
  );
}
