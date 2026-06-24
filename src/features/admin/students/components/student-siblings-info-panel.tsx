'use client';

import { SiblingsInfoPanel } from '@/features/admin/admissions/components/siblings-info-panel';
import type { StudentSummary } from '@/types/student-360';

export function StudentSiblingsInfoPanel({ student }: { student: StudentSummary }) {
  return <SiblingsInfoPanel detail={student} layout="panel" />;
}
