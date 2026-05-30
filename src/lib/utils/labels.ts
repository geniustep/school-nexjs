// User-facing label maps. This is the single place where backend enum values
// become human strings. Deliberately free of any Odoo/technical terminology
// (no "model", "domain", "res.partner", etc.).

import type { Role } from '@/types/user';
import type { AttendanceStatus } from '@/types/attendance';
import type { ChannelType } from '@/types/channel';
import type { StudentStatus } from '@/types/student';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  left_early: 'Left early',
};

export const ATTENDANCE_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  public: 'General',
  class: 'Class',
  teachers: 'Teachers',
  parents: 'Parents',
  announcement: 'Announcements',
  private: 'Private',
};

export const STATUS_LABEL: Record<StudentStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  graduated: 'Graduated',
  suspended: 'Suspended',
  expelled: 'Expelled',
  transferred: 'Transferred',
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return (STATUS_LABEL as Record<string, string>)[status] ?? titleCase(status);
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
