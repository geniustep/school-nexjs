/** Internal sections within the Student 360 finance tab. */
export type StudentFinanceSubTab =
  | 'overview'
  | 'fees'
  | 'agreements'
  | 'schedule'
  | 'collections'
  | 'cheques'
  | 'adjustments'
  | 'ledger'
  | 'historical';

export const STUDENT_FINANCE_SUB_TABS: StudentFinanceSubTab[] = [
  'overview',
  'fees',
  'agreements',
  'schedule',
  'collections',
  'cheques',
  'adjustments',
  'ledger',
  'historical',
];

const SUB_TAB_SET = new Set<string>(STUDENT_FINANCE_SUB_TABS);

/** Legacy URL value kept for redirects from the removed main tab. */
export const LEGACY_FINANCE_AGREEMENT_SECTION = 'agreement';

export function isStudentFinanceSubTab(value: string | null | undefined): value is StudentFinanceSubTab {
  return !!value && SUB_TAB_SET.has(value);
}

export function parseStudentFinanceSubTab(value: string | null | undefined): StudentFinanceSubTab {
  if (isStudentFinanceSubTab(value)) return value;
  if (value === LEGACY_FINANCE_AGREEMENT_SECTION) return 'agreements';
  return 'overview';
}

export function studentFinanceSubTabLabelKey(tab: StudentFinanceSubTab): string {
  return `admin.student360.financeWorkspace.tabs.${tab}`;
}

export function buildStudentFinanceWorkspaceHref(
  studentId: number | string,
  subTab: StudentFinanceSubTab = 'overview',
): string {
  const base = `/admin/students/${studentId}?tab=finance`;
  if (subTab === 'overview') return base;
  return `${base}&financeSubTab=${subTab}`;
}
