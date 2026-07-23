'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { FamilyCollectSource } from '@/features/admin/finance/family-collect-query';
import { FamilyCollectionWorkflowForm } from './family-collection-workflow-form';
import { QuickPaymentDrawer } from './quick-payment-drawer';
import type { FamilyCollectionCreateResponse } from '@/types/family-finance';

export function FamilyCollectionDrawer({
  open,
  familyId,
  accountName,
  suggestedAmount,
  source,
  currency,
  prefilledStudentId,
  prefilledStudentName,
  entrySource,
  navigateToReceiptOnSuccess = true,
  onClose,
  onSuccess,
}: {
  open: boolean;
  familyId: number;
  accountName?: string;
  suggestedAmount?: number | null;
  source?: FamilyCollectSource | null;
  currency?: unknown;
  prefilledStudentId?: number;
  prefilledStudentName?: string;
  entrySource?: 'student360';
  /** When false, keep the caller page mounted and let it render the official receipt link. */
  navigateToReceiptOnSuccess?: boolean;
  onClose: () => void;
  onSuccess?: (result: FamilyCollectionCreateResponse) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const toast = useToast();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) handledRef.current = false;
  }, [open]);

  function handleDone(result: FamilyCollectionCreateResponse) {
    if (handledRef.current) {
      onClose();
      return;
    }
    handledRef.current = true;
    onSuccess?.(result);

    const receiptId = result.receipt_id ?? result.receipts[0]?.id ?? null;
    const collectionId = result.collection_id ?? result.id ?? result.collections[0]?.id ?? null;
    const returnTo = encodeURIComponent(pathname || `/admin/finance/billing-accounts/${familyId}`);

    if (navigateToReceiptOnSuccess && receiptId) {
      toast.success(t('admin.finance.billingAccounts.familyCollection.successToast'));
      router.push(`/admin/finance/receipts/${receiptId}?returnTo=${returnTo}`);
    } else if (navigateToReceiptOnSuccess && collectionId) {
      toast.success(t('admin.finance.billingAccounts.familyCollection.receiptPendingHint'));
      router.push(`/admin/finance/collections/${collectionId}?returnTo=${returnTo}`);
    } else {
      toast.success(t('admin.finance.billingAccounts.familyCollection.successToast'));
    }
    onClose();
  }

  return (
    <QuickPaymentDrawer
      open={open}
      mode="family"
      subtitle={accountName}
      source={source}
      onClose={onClose}
    >
      <FamilyCollectionWorkflowForm
        familyId={familyId}
        accountName={accountName}
        suggestedAmount={suggestedAmount}
        source={source}
        currency={currency}
        prefilledStudentId={prefilledStudentId}
        prefilledStudentName={prefilledStudentName}
        entrySource={entrySource}
        onDone={handleDone}
        onCancel={onClose}
      />
    </QuickPaymentDrawer>
  );
}
