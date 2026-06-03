'use client';

import Link from 'next/link';
import { Avatar, Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StudentTodayAttendance } from '@/features/teacher/use-teacher-student-detail';
import { getStudentDisplayName, type StudentNameFields } from '@/lib/utils/student';
import type { AttendanceStatus } from '@/types/attendance';

function statusText(t: ReturnType<typeof useT>, status: string | undefined) {
  if (!status) return t('common.dash');
  const key = `states.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function attendanceLabel(t: ReturnType<typeof useT>, status: AttendanceStatus): string {
  const key = status === 'left_early' ? 'leftEarly' : status;
  return t(`attendance.${key}`);
}

const ATTENDANCE_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export function TeacherStudentCard({
  classId,
  student,
  todayAttendance,
}: {
  classId: number;
  student: StudentNameFields & { id: number; code?: string | null; status?: string };
  todayAttendance?: StudentTodayAttendance | null;
}) {
  const t = useT();
  const name = getStudentDisplayName(student);
  const href = `/teacher/classes/${classId}/students/${student.id}`;

  return (
    <Link href={href} className="t-student-card">
      <div className="t-student-card__avatar-wrap">
        <Avatar name={name} />
      </div>
      <div className="t-student-card__body">
        <strong className="t-student-card__name">{name}</strong>
        {student.code && <span className="t-student-card__code mono">{student.code}</span>}
        <div className="t-student-card__meta">
          {student.status && (
            <Badge tone={student.status === 'active' ? 'green' : 'slate'}>
              {statusText(t, student.status)}
            </Badge>
          )}
          {todayAttendance && (
            <Badge tone={ATTENDANCE_TONE[todayAttendance.status]}>
              {attendanceLabel(t, todayAttendance.status)}
              {!todayAttendance.recorded && ` · ${t('teacher.notRecordedYet')}`}
            </Badge>
          )}
        </div>
      </div>
      <span className="t-student-card__arrow" aria-hidden="true">‹</span>
    </Link>
  );
}
