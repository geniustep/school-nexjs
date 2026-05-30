// Attendance status badge — consistent tone + label across all portals.

import { Badge } from '@/components/ui/primitives';
import { ATTENDANCE_LABEL, ATTENDANCE_TONE } from '@/lib/utils/labels';
import type { AttendanceStatus } from '@/types/attendance';

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_LABEL[status]}</Badge>;
}
