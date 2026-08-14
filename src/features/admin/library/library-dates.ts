const DAY_MS = 24 * 60 * 60 * 1000;

export type LibraryDueTone = 'overdue' | 'today' | 'upcoming' | 'returned' | 'unknown';

export type LibraryDueStatus = {
  label: string;
  tone: LibraryDueTone;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function relativeDaysLabel(days: number, prefix: 'متأخر' | 'متبقي'): string {
  if (days === 1) return prefix === 'متأخر' ? 'متأخر يومًا' : 'متبقي يوم واحد';
  if (days === 2) return prefix === 'متأخر' ? 'متأخر يومين' : 'متبقي يومان';
  if (days >= 3 && days <= 10) return `${prefix} ${days} أيام`;
  return `${prefix} ${days} يومًا`;
}

export function toLibraryDateTimeLocal(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function minimumLibraryDueAt(now = new Date()): string {
  return toLibraryDateTimeLocal(new Date(now.getTime() + 60_000));
}

export function isLibraryDueAtFuture(value: string, now = new Date()): boolean {
  if (!value.trim()) return false;
  const due = new Date(value);
  return Number.isFinite(due.getTime()) && due.getTime() > now.getTime();
}

export function libraryDueStatus(
  dueAt: string | null | undefined,
  overdue: boolean,
  state: string,
  now = new Date(),
): LibraryDueStatus {
  if (state === 'returned') return { label: 'تمت الإعادة', tone: 'returned' };
  if (!dueAt) return { label: 'موعد الاستحقاق غير محدد', tone: 'unknown' };

  const due = new Date(dueAt);
  if (!Number.isFinite(due.getTime())) return { label: 'موعد الاستحقاق غير صالح', tone: 'unknown' };

  const dayDifference = Math.round((startOfLocalDay(due) - startOfLocalDay(now)) / DAY_MS);
  if (overdue || due.getTime() < now.getTime()) {
    return {
      label: relativeDaysLabel(Math.max(1, Math.abs(dayDifference)), 'متأخر'),
      tone: 'overdue',
    };
  }
  if (dayDifference === 0) return { label: 'يستحق اليوم', tone: 'today' };
  if (dayDifference === 1) return { label: 'يستحق غدًا', tone: 'upcoming' };
  return { label: relativeDaysLabel(Math.max(1, dayDifference), 'متبقي'), tone: 'upcoming' };
}
