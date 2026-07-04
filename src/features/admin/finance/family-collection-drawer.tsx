'use client';

import { useEffect, useRef } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { FamilyCollectionWorkflowForm } from './family-collection-workflow-form';
import type { FamilyCollectionCreateResponse } from '@/types/family-finance';
import './finance-ui.css';

export function FamilyCollectionDrawer({
  open,
  familyId,
  accountName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  familyId: number;
  accountName?: string;
  onClose: () => void;
  onSuccess?: (result: FamilyCollectionCreateResponse) => void;
}) {
  const t = useT();
  const toast = useToast();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) handledRef.current = false;
  }, [open]);

  if (!open) return null;

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
    <SetupDrawer
      open={open}
      title={t('admin.finance.billingAccounts.familyCollection.drawerTitle')}
      subtitle={accountName}
      onClose={onClose}
      size="collection"
      className="finance-collection-drawer finance-family-collection-drawer"
      iconClose
    >
      <FamilyCollectionWorkflowForm
        familyId={familyId}
        accountName={accountName}
        onDone={handleDone}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
