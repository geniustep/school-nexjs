export type StudentFinanceSubTab =
  | 'overview'
  | 'fees'
  | 'schedule'
  | 'collections'
  | 'agreements';

export const STUDENT_FINANCE_SUB_TABS: StudentFinanceSubTab[] = [
  'overview',
  'fees',
  'schedule',
  'collections',
  'agreements',
];

export function parseStudentFinanceSubTab(value: string | null | undefined): StudentFinanceSubTab {
  if (value === 'fees' || value === 'schedule' || value === 'collections' || value === 'agreements') {
    return value;
  }
  return 'overview';
}

export function studentFinanceSubTabLabelKey(tab: StudentFinanceSubTab): string {
  return `admin.student360.financeWorkspace.tabs.${tab}`;
}
