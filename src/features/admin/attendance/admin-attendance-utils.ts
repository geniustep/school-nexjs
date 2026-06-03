import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

export const ATT_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Default to today; explicit ISO in ?date= overrides; ?date=today is equivalent. */
export function resolveInitialDate(dateParam: string | null): string {
  if (!dateParam || dateParam === 'today') return todayIso();
  return dateParam;
}

export function attendanceStatusLabelKey(status: AttendanceStatus): string {
  return status === 'left_early' ? 'attendance.leftEarly' : `attendance.${status}`;
}

export function summarizeRecords(records: AttendanceRecord[]) {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    left_early: 0,
  };
  for (const r of records) counts[r.status] += 1;
  const total = records.length;
  const presentPct = total > 0 ? Math.round((counts.present / total) * 100) : null;
  return { counts, total, presentPct };
}

export function isDefaultFilters(date: string, status: string, classId: string): boolean {
  return date === todayIso() && !status && !classId;
}
