'use client';

import { useEffect, useRef } from 'react';
import '@/features/admin/finance/finance-ui.css';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { CollectionWorkflowForm } from './collection-workflow-form';
import type { PaymentCollection } from '@/types/finance';
import type { CollectionUpdatedOverview, StudentFinancialOverview } from '@/types/student-financial-overview';

export function StudentCollectionDrawer({
  open,
  studentId,
  studentName,
  studentCode,
  academicYearId,
  billingProfileId,
  billingPartnerId,
  financialOverview,
  onClose,
  onSuccess,
  onOverviewUpdate,
}: {
  open: boolean;
  studentId: number;
  studentName?: string | null;
  studentCode?: string | null;
  academicYearId?: number;
  billingProfileId?: number;
  billingPartnerId?: number;
  financialOverview?: StudentFinancialOverview | null;
  onClose: () => void;
  onSuccess: () => void;
  onOverviewUpdate?: (overview: CollectionUpdatedOverview) => void;
}) {
  const t = useT();
  const toast = useToast();
  const handledCollectionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) handledCollectionIdRef.current = null;
  }, [open]);

  if (!open) return null;

  const displayName = studentName ?? '';
  const subtitle = displayName || undefined;

  function handleDone(collection: PaymentCollection) {
    if (handledCollectionIdRef.current === collection.id) {
      onClose();
      return;
    }
    handledCollectionIdRef.current = collection.id;
    toast.success(t('admin.finance.collectionWorkflow.refreshSuccessToast'));
    onSuccess();
    if (collection.payment_method === 'cheque' || collection.payment_method === 'check') {
      toast.show(t('admin.finance.collectionWorkflow.chequePendingNote'), 'info');
    }
    onClose();
  }

  function handleOverviewUpdate(overview: CollectionUpdatedOverview) {
    onOverviewUpdate?.(overview);
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.collectionWorkflow.drawerTitle')}
      subtitle={subtitle || undefined}
      onClose={onClose}
      size="collection"
      className="finance-collection-drawer"
    >
      <CollectionWorkflowForm
        embedded
        initialStudentId={studentId}
        lockStudent
        initialAcademicYearId={academicYearId}
        initialBillingProfileId={billingProfileId}
        initialBillingPartnerId={billingPartnerId}
        financialOverview={financialOverview}
        useInstallmentAllocations
        onOverviewUpdate={handleOverviewUpdate}
        onDone={handleDone}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
