import type { StudentSearchMatchedOn } from '@/types/student-search';

const MATCHED_ON_LABEL_KEYS: Record<StudentSearchMatchedOn, string> = {
  name: 'admin.spotlight.matchedOn.name',
  guardian_phone: 'admin.spotlight.matchedOn.guardian_phone',
  massar: 'admin.spotlight.matchedOn.massar',
  student_code: 'admin.spotlight.matchedOn.student_code',
};

export function isStudentSpotlightOpenShortcut(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): boolean {
  if (event.key.toLowerCase() !== 'k') return false;
  return Boolean(event.metaKey || event.ctrlKey);
}

export function isStudentSpotlightCloseKey(key: string): boolean {
  return key === 'Escape';
}

export function studentSpotlightNavigatePath(studentId: number): string {
  return `/admin/students/${studentId}`;
}

export function studentSpotlightMatchedOnLabelKey(
  matchedOn: StudentSearchMatchedOn | undefined,
): string | null {
  if (!matchedOn) return null;
  return MATCHED_ON_LABEL_KEYS[matchedOn] ?? null;
}

export function moveSpotlightActiveIndex(
  currentIndex: number,
  resultCount: number,
  direction: 'up' | 'down',
): number {
  if (resultCount <= 0) return -1;
  if (currentIndex < 0) return direction === 'down' ? 0 : resultCount - 1;
  if (direction === 'down') return (currentIndex + 1) % resultCount;
  return (currentIndex - 1 + resultCount) % resultCount;
}
