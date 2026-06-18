import { appendReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';
import {
  buildStudentFinanceWorkspaceHref,
  type StudentFinanceSubTab,
} from '@/features/admin/student-finance/utils/student-finance-sub-tab';

/** @deprecated Use StudentFinanceSubTab — financial-agreement is now a finance section. */
export type StudentFinanceTab = 'finance' | 'financial-agreement';

export function buildFinanceStudentProfileLink(
  studentId: number | string,
  returnTo?: string | null,
): string {
  return appendReturnTo(`/admin/finance/students/${studentId}`, returnTo);
}

export function buildStudentFinanceLink(
  studentId: number | string,
  tab: StudentFinanceTab | StudentFinanceSubTab = 'finance',
  returnTo?: string | null,
): string {
  const subTab: StudentFinanceSubTab =
    tab === 'financial-agreement' || tab === 'agreements' ? 'agreements' : tab === 'finance' ? 'overview' : tab;

  let href = buildStudentFinanceWorkspaceHref(studentId, subTab);

  if (returnTo && isSafeInternalReturnPath(returnTo)) {
    const separator = href.includes('?') ? '&' : '?';
    href = `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
  }

  return href;
}

export function buildFinanceHubLink(path: string, returnTo?: string | null): string {
  return appendReturnTo(path, returnTo);
}
