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
  onClose,
  onSuccess,
}: {
  open: boolean;
  familyId: number;
  accountName?: string;
  suggestedAmount?: number | null;
  source?: FamilyCollectSource | null;
  currency?: unknown;
  onClose: () => void;
  onSuccess?: (result: FamilyCollectionCreateResponse) => void;
}) {
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
    toast.success(t('admin.finance.billingAccounts.familyCollection.successToast'));
    onSuccess?.(result);
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
        onDone={handleDone}
        onCancel={onClose}
      />
    </QuickPaymentDrawer>
  );
}
