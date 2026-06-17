'use client';

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
  academicYearId?: number;
  billingProfileId?: number;
  billingPartnerId?: number;
  financialOverview?: StudentFinancialOverview | null;
  onClose: () => void;
  onSuccess: () => void;
  onOverviewUpdate?: () => void;
}) {
  const t = useT();
  const toast = useToast();

  if (!open) return null;

  function handleDone(collection: PaymentCollection) {
    toast.success(t('admin.finance.collectionWorkflow.successToast'));
    onSuccess();
    if (collection.payment_method === 'cheque' || collection.payment_method === 'check') {
      toast.show(t('admin.finance.collectionWorkflow.chequePendingNote'), 'info');
    }
  }

  function handleOverviewUpdate(_overview: CollectionUpdatedOverview) {
    onOverviewUpdate?.();
  }

  return (
    <SetupDrawer open={open} title={t('admin.finance.collectionWorkflow.drawerTitle')} onClose={onClose} size="wide">
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
