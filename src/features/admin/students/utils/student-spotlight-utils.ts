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

const DID_YOU_MEAN_QUERY_MARKER = '\u0000';

export function splitStudentSpotlightDidYouMeanLabel(
  label: string,
): { before: string; after: string } {
  const markerIndex = label.indexOf(DID_YOU_MEAN_QUERY_MARKER);
  if (markerIndex === -1) {
    return { before: label, after: '' };
  }
  return {
    before: label.slice(0, markerIndex),
    after: label.slice(markerIndex + DID_YOU_MEAN_QUERY_MARKER.length),
  };
}

export function buildStudentSpotlightDidYouMeanLabel(
  translate: (key: string, params?: Record<string, string | number>) => string,
): { before: string; after: string } {
  const label = translate('admin.spotlight.didYouMean', {
    query: DID_YOU_MEAN_QUERY_MARKER,
  });
  return splitStudentSpotlightDidYouMeanLabel(label);
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
