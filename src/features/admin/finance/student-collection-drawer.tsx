'use client';

import '@/features/admin/finance/finance-ui.css';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { CollectionWorkflowForm } from './collection-workflow-form';
import type { PaymentCollection } from '@/types/finance';

export function StudentCollectionDrawer({
  open,
  studentId,
  academicYearId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studentId: number;
  academicYearId?: number;
  onClose: () => void;
  onSuccess: () => void;
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

  return (
    <SetupDrawer open={open} title={t('admin.finance.collectionWorkflow.drawerTitle')} onClose={onClose}>
      <CollectionWorkflowForm
        embedded
        initialStudentId={studentId}
        lockStudent
        initialAcademicYearId={academicYearId}
        useInstallmentAllocations
        onDone={handleDone}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
