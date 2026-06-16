'use client';

import { use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { FeeTypeDetailView } from '@/features/admin/finance/fee-types/fee-type-detail-view';
import { FeeTypeDetailSkeleton } from '@/features/admin/finance/fee-types/fee-type-skeleton';
import { buildFeeTypeListPath } from '@/features/admin/finance/fee-types/normalize-fee-type';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FeeTypeDetail } from '@/types/finance';
import Link from 'next/link';
import '@/features/admin/finance/fee-types/fee-type-ui.css';

export default function AdminFinanceFeeTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/fee-types');

  const state = useAdminResource<FeeTypeDetail>(endpoints.admin.financeFeeType(id));
  const referenceState = useAdminResource<{ currencies?: Array<{ id: number; name: string }> }>(
    endpoints.admin.financeReferenceData,
  );
  const currencies = referenceState.data?.currencies ?? [];

  const listPath = useMemo(() => buildFeeTypeListPath({}), []);

  if (state.loading && state.data === null) {
    return (
      <RequireAdminPermission permission={FINANCE_VIEW}>
        <FeeTypeDetailSkeleton />
      </RequireAdminPermission>
    );
  }

  if (state.error) {
    const isNotFound = state.error.code === 'fee_type_not_found' || state.error.code === 'not_found';
    return (
      <RequireAdminPermission permission={FINANCE_VIEW}>
        <div className="fee-type-detail-page">
          <Link href={returnTo} className="back-link">
            ‹ {t('admin.finance.feeTypesWorkspace.backToFeeTypes')}
          </Link>
          {isNotFound ? (
            <div className="card">
              <h2>{t('admin.finance.feeTypesWorkspace.notFound')}</h2>
              <Link href={returnTo} className="btn btn--ghost btn--sm">
                {t('admin.finance.feeTypesWorkspace.backToFeeTypes')}
              </Link>
            </div>
          ) : (
            <ApiErrorView error={state.error} onRetry={state.reload} />
          )}
        </div>
      </RequireAdminPermission>
    );
  }

  if (!state.data) {
    return (
      <RequireAdminPermission permission={FINANCE_VIEW}>
        <FeeTypeDetailSkeleton />
      </RequireAdminPermission>
    );
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="fee-type-detail-page">
        <FeeTypeDetailView
          feeType={state.data}
          returnTo={returnTo}
          currencies={currencies}
          onReload={() => state.reload()}
          onDeleted={() => router.push(returnTo || listPath)}
        />
      </div>
    </RequireAdminPermission>
  );
}
