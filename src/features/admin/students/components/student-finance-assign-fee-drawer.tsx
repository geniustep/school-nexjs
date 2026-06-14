'use client';

import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceAssignFeeForm } from '@/features/admin/finance/assign-fee-form';
import { useT } from '@/features/i18n/locale-context';

export function StudentFinanceAssignFeeDrawer({
  open,
  studentId,
  classId,
  initialAcademicYearId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  studentId: number;
  classId?: number | null;
  initialAcademicYearId?: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const t = useT();

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.finance.assignDrawer.title')}
      onClose={onClose}
    >
      <p className="student-finance-assign-drawer__desc muted">
        {t('admin.student360.finance.assignDrawer.description')}
      </p>
      <FinanceAssignFeeForm
        studentId={studentId}
        classId={classId}
        initialAcademicYearId={initialAcademicYearId}
        copyScope="student360"
        onDone={onAssigned}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
