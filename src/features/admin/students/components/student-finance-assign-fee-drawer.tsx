'use client';

import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceAssignFeeForm } from '@/features/admin/finance/assign-fee-form';
import { useT } from '@/features/i18n/locale-context';
import type { AssignStudentFeePlanResponse } from '@/types/finance';

export function StudentFinanceAssignFeeDrawer({
  open,
  studentId,
  classId,
  levelId,
  initialAcademicYearId,
  enrollmentJoinDate,
  enrollmentStartDate,
  onClose,
  onAssigned,
}: {
  open: boolean;
  studentId: number;
  classId?: number | null;
  levelId?: number | null;
  initialAcademicYearId?: string;
  enrollmentJoinDate?: string | null;
  enrollmentStartDate?: string | null;
  onClose: () => void;
  onAssigned: (result?: AssignStudentFeePlanResponse) => void;
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
        levelId={levelId}
        initialAcademicYearId={initialAcademicYearId}
        enrollmentJoinDate={enrollmentJoinDate}
        enrollmentStartDate={enrollmentStartDate}
        copyScope="student360"
        onDone={onAssigned}
        onCancel={onClose}
      />
    </SetupDrawer>
  );
}
