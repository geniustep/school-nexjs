'use client';

// Attendance status badge — consistent tone + i18n label across all portals.

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { ATTENDANCE_TONE } from '@/lib/utils/labels';
import { attendanceStatusLabelKey } from '@/features/admin/attendance/admin-attendance-utils';
import type { AttendanceStatus } from '@/types/attendance';

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const t = useT();
  return <Badge tone={ATTENDANCE_TONE[status]}>{t(attendanceStatusLabelKey(status))}</Badge>;
}
