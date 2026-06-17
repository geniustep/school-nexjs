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
  onOverviewUpdate?: () => void;
}) {
  const t = useT();
  const toast = useToast();

  if (!open) return null;

  const displayName = studentName ?? '';
  const subtitle = displayName || undefined;

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
