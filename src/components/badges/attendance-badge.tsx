'use client';

// Attendance status badge — consistent tone + i18n label across all portals.

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { ATTENDANCE_TONE } from '@/lib/utils/labels';
import { attendanceStatusLabelKey } from '@/features/admin/attendance/admin-attendance-utils';
import type { AttendanceStatus } from '@/types/attendance';

const VALID: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

function isAttendanceStatus(v: string): v is AttendanceStatus {
  return (VALID as string[]).includes(v);
}

export function AttendanceBadge({ status }: { status: AttendanceStatus | string }) {
  const t = useT();
  if (!isAttendanceStatus(status)) {
    return <Badge tone="slate">{t('dashboard.notRecorded')}</Badge>;
  }
  return <Badge tone={ATTENDANCE_TONE[status]}>{t(attendanceStatusLabelKey(status))}</Badge>;
}
