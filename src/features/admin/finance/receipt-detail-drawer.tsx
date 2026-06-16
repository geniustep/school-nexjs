'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { ReceiptDetailView } from '@/features/admin/finance/receipt-detail-view';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeFinanceReceipt } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export function ReceiptDetailDrawer({
  open,
  receiptId,
  onClose,
  returnTo,
}: {
  open: boolean;
  receiptId: number | null;
  onClose: () => void;
  returnTo?: string;
}) {
  const t = useT();
  const state = useAdminResource<FinanceReceipt>(
    receiptId ? endpoints.admin.financeReceipt(receiptId) : null,
  );

  const receipt = useMemo(
    () => (state.data ? normalizeFinanceReceipt(state.data) : null),
    [state.data],
  );

  if (!open || !receiptId) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.receipts.detailTitle')}
      onClose={onClose}
      size="wide"
    >
      {state.loading && !receipt ? <LoadingState label={t('common.loading')} /> : null}
      {state.error ? <p className="form-error">{state.error.message}</p> : null}
      {receipt ? (
        <>
          <div className="receipt-drawer-actions">
            <Link href={`/admin/finance/receipts/${receipt.id}`} className="btn btn--ghost btn--sm">
              {t('admin.finance.receipts.openFullPage')}
            </Link>
          </div>
          <div className="receipt-drawer-body">
            <ReceiptDetailView receipt={receipt} returnTo={returnTo} />
          </div>
        </>
      ) : null}
    </SetupDrawer>
  );
}
