'use client';

import { SiblingsInfoPanel } from '@/features/admin/admissions/components/siblings-info-panel';
import type { StudentSummary } from '@/types/student-360';

export function StudentSiblingsInfoPanel({
  student,
  canManage = false,
  onAddSibling,
}: {
  student: StudentSummary;
  canManage?: boolean;
  onAddSibling?: () => void;
}) {
  return (
    <SiblingsInfoPanel
      detail={student}
      layout="panel"
      canManage={canManage}
      onAddSibling={onAddSibling}
    />
  );
}
