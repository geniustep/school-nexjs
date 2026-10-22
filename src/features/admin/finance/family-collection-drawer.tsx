'use client';

import { useEffect, useRef } from 'react';
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
  /** @deprecated Successful family collections now always remain in the drawer for direct printing. */
  navigateToReceiptOnSuccess?: boolean;
  onClose: () => void;
  onSuccess?: (result: FamilyCollectionCreateResponse) => void;
}) {
  const t = useT();
  const toast = useToast();
  const handledRef = useRef(false);
  const confirmedRef = useRef<FamilyCollectionCreateResponse | null>(null);

  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      confirmedRef.current = null;
    }
  }, [open]);

  function handleClose() {
    const result = confirmedRef.current;
    if (result && !handledRef.current) {
      handledRef.current = true;
      onSuccess?.(result);
      toast.success(t('admin.finance.billingAccounts.familyCollection.successToast'));
    }
    onClose();
  }

  function handleDone(result: FamilyCollectionCreateResponse) {
    confirmedRef.current = result;
    handleClose();
  }

  return (
    <QuickPaymentDrawer
      open={open}
      mode="family"
      subtitle={accountName}
      source={source}
      onClose={handleClose}
    >
      <FamilyCollectionWorkflowForm
        key={familyId}
        familyId={familyId}
        accountName={accountName}
        suggestedAmount={suggestedAmount}
        source={source}
        currency={currency}
        prefilledStudentId={prefilledStudentId}
        prefilledStudentName={prefilledStudentName}
        entrySource={entrySource}
        onDone={handleDone}
        onConfirmed={(result) => { confirmedRef.current = result; }}
        onCancel={handleClose}
      />
    </QuickPaymentDrawer>
  );
}
