import { describe, expect, it } from 'vitest';
import {
  parseStudentFinanceSubTab,
  STUDENT_FINANCE_SUB_TABS,
} from './student-finance-sub-tab';

describe('parseStudentFinanceSubTab', () => {
  it('keeps active finance sub-tabs', () => {
    expect(STUDENT_FINANCE_SUB_TABS).toEqual([
      'overview',
      'agreements',
      'schedule',
      'collections',
      'cheques',
      'historical',
    ]);
    expect(parseStudentFinanceSubTab('schedule')).toBe('schedule');
  });

  it('redirects removed fees, adjustments, and ledger tabs', () => {
    expect(parseStudentFinanceSubTab('fees')).toBe('agreements');
    expect(parseStudentFinanceSubTab('adjustments')).toBe('agreements');
    expect(parseStudentFinanceSubTab('ledger')).toBe('historical');
  });

  it('redirects legacy agreement section', () => {
    expect(parseStudentFinanceSubTab('agreement')).toBe('agreements');
  });
});
