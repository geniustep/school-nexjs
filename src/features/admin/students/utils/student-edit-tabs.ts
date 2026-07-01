export type StudentEditTabId =
  | 'personal'
  | 'identity'
  | 'schooling'
  | 'admin'
  | 'emergency'
  | 'siblings'
  | 'health'
  | 'guardians'
  | 'documents';

export const STUDENT_EDIT_TABS: StudentEditTabId[] = [
  'personal',
  'identity',
  'schooling',
  'admin',
  'emergency',
  'siblings',
  'health',
  'guardians',
  'documents',
];

export function parseStudentEditTab(
  raw: string | null | undefined,
  available: StudentEditTabId[],
): StudentEditTabId {
  if (raw && available.includes(raw as StudentEditTabId)) {
    return raw as StudentEditTabId;
  }
  return available[0] ?? 'personal';
}

export function buildStudentEditTabHref(studentId: string | number, tab: StudentEditTabId): string {
  return `/admin/students/${studentId}/edit?tab=${tab}`;
}

export function studentEditTabUsesProfileSave(tab: StudentEditTabId): boolean {
  return (
    tab === 'personal' ||
    tab === 'identity' ||
    tab === 'schooling' ||
    tab === 'admin' ||
    tab === 'emergency' ||
    tab === 'siblings'
  );
}

export function studentEditTabToSaveSection(
  tab: StudentEditTabId,
): 'personal' | 'identity' | 'schooling' | 'admin' | 'emergency' | 'siblings' | null {
  if (tab === 'personal') return 'personal';
  if (tab === 'identity') return 'identity';
  if (tab === 'schooling') return 'schooling';
  if (tab === 'admin') return 'admin';
  if (tab === 'emergency') return 'emergency';
  if (tab === 'siblings') return 'siblings';
  return null;
}
