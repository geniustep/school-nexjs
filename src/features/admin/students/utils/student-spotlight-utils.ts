import { channelComposeHref } from '@/features/channels/utils/parse-channel-compose-student-id';
import { canOpenStudentCommunication } from '@/features/channels/utils/can-open-student-communication';
import { canCollectPayments } from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { StudentSearchHit, StudentSearchMatchedOn } from '@/types/student-search';
import type { CurrentUser } from '@/types/user';
import { studentClassLabel, studentLevelLabel } from './student-academic-labels';

const MATCHED_ON_LABEL_KEYS: Record<StudentSearchMatchedOn, string> = {
  name: 'admin.spotlight.matchedOn.name',
  guardian_phone: 'admin.spotlight.matchedOn.guardian_phone',
  guardian_identity: 'admin.spotlight.matchedOn.guardian_identity',
  massar: 'admin.spotlight.matchedOn.massar',
  student_code: 'admin.spotlight.matchedOn.student_code',
};

export function isStudentSpotlightOpenShortcut(event: {
  code: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  isComposing?: boolean;
}): boolean {
  if (event.isComposing) return false;
  if (event.code !== 'KeyK') return false;
  return Boolean(event.metaKey || event.ctrlKey);
}

export type StudentSpotlightShortcutAction = 'open' | 'refocus';

export function getStudentSpotlightShortcutAction(
  isOpen: boolean,
): StudentSpotlightShortcutAction {
  return isOpen ? 'refocus' : 'open';
}

export function isStudentSpotlightCloseKey(key: string): boolean {
  return key === 'Escape';
}

export function studentSpotlightNavigatePath(studentId: number): string {
  return `/admin/students/${studentId}`;
}

export function studentSpotlightPaymentPath(studentId: number): string {
  return `/admin/finance/collections/new?studentId=${studentId}`;
}

export function studentSpotlightMessagePath(studentId: number): string {
  return channelComposeHref(studentId);
}

export function canOpenStudentSpotlightProfile(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_students');
}

export function canOpenStudentSpotlightPayment(user: CurrentUser | null): boolean {
  return canCollectPayments(user);
}

export function canOpenStudentSpotlightMessage(user: CurrentUser | null): boolean {
  return canOpenStudentCommunication(user);
}

/** Canonical full display name for Spotlight — never prefer stale name_ar. */
export function studentSpotlightArabicName(
  student: Pick<StudentSearchHit, 'name_ar' | 'full_name' | 'name' | 'first_name' | 'last_name'>,
): string {
  const fullName = student.full_name?.trim();
  if (fullName) return fullName;
  const display = getStudentDisplayName(student);
  return display === '—' ? '' : display;
}

/** Stored Latin/French name only — never invent or transliterate. */
export function studentSpotlightLatinName(
  student: Pick<StudentSearchHit, 'name_latin'>,
): string | null {
  const latin = student.name_latin?.trim();
  return latin ? latin : null;
}

export function studentSpotlightIdentityTitle(
  student: Pick<
    StudentSearchHit,
    'name_ar' | 'name_latin' | 'full_name' | 'name' | 'first_name' | 'last_name'
  >,
): string {
  const arabic = studentSpotlightArabicName(student);
  const latin = studentSpotlightLatinName(student);
  if (arabic && latin) return `${arabic} — ${latin}`;
  return arabic || latin || '';
}

/** Level · Class · Code — omit missing parts and their separators. */
export function studentSpotlightAcademicLine(
  student: Pick<StudentSearchHit, 'level' | 'class' | 'code'>,
): string {
  const level = studentLevelLabel(student.level);
  const classLabel = studentClassLabel(student.class);
  const code = student.code?.trim() || '';
  return [level !== '—' ? level : '', classLabel !== '—' ? classLabel : '', code]
    .filter(Boolean)
    .join(' · ');
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
