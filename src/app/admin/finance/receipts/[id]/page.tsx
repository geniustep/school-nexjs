'use client';

import Link from 'next/link';
import { use, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ReceiptDetailView } from '@/features/admin/finance/receipt-detail-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import { normalizeFinanceReceipt } from '@/lib/utils/normalize-finance-receipt';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceReceipt } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';

export default function AdminFinanceReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/receipts');

  const state = useAdminResource<FinanceReceipt>(endpoints.admin.financeReceipt(id));
  const receipt = useMemo(
    () => (state.data ? normalizeFinanceReceipt(state.data) : null),
    [state.data],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href={returnTo} className="back-link">
        ‹ {t('admin.finance.receipts.backToList')}
      </Link>
      {state.loading && !receipt ? <LoadingState label={t('common.loading')} /> : null}
      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}
      {receipt ? <ReceiptDetailView receipt={receipt} returnTo={returnTo} /> : null}
    </RequireAdminPermission>
  );
}
