import { appendReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';

export type StudentFinanceTab = 'finance' | 'financial-agreement';

export function buildFinanceStudentProfileLink(
  studentId: number | string,
  returnTo?: string | null,
): string {
  return appendReturnTo(`/admin/finance/students/${studentId}`, returnTo);
}

export function buildStudentFinanceLink(
  studentId: number | string,
  tab: StudentFinanceTab = 'finance',
  returnTo?: string | null,
): string {
  const params = new URLSearchParams({ tab });
  if (returnTo && isSafeInternalReturnPath(returnTo)) {
    params.set('returnTo', returnTo);
  }
  return `/admin/students/${studentId}?${params.toString()}`;
}

export function buildFinanceHubLink(path: string, returnTo?: string | null): string {
  return appendReturnTo(path, returnTo);
}
