// User-facing label maps. Backend enum values → i18n keys (resolved via `t()`).
// Deliberately free of Odoo/technical terminology.

import type { TranslateFn } from '@/features/i18n/locale-context';
import type { AttendanceStatus } from '@/types/attendance';
import type { ChannelType } from '@/types/channel';
import { attendanceStatusLabelKey } from '@/features/admin/attendance/admin-attendance-utils';

export const ATTENDANCE_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

type WorkflowTone = 'green' | 'red' | 'amber' | 'blue' | 'slate';

export const WORKFLOW_TONE: Record<string, WorkflowTone> = {
  draft: 'slate',
  published: 'green',
  closed: 'amber',
  done: 'green',
  cancelled: 'red',
  archived: 'slate',
  submitted: 'blue',
  reviewed: 'green',
  active: 'green',
};

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function attendanceStatusLabel(t: TranslateFn, status: AttendanceStatus): string {
  return t(attendanceStatusLabelKey(status));
}

export function channelTypeLabel(t: TranslateFn, type: ChannelType | string): string {
  const key = `channels.type.${type}`;
  const label = t(key);
  return label === key ? titleCase(String(type)) : label;
}

export function statusLabel(t: TranslateFn, status: string | null | undefined): string {
  if (!status) return '—';
  const sk = `studentStatus.${status}`;
  const sl = t(sk);
  if (sl !== sk) return sl;
  const st = `states.${status}`;
  const stl = t(st);
  if (stl !== st) return stl;
  return titleCase(status);
}

export function workflowTone(state: string | null | undefined): WorkflowTone {
  if (!state) return 'slate';
  return WORKFLOW_TONE[state] ?? 'slate';
}
