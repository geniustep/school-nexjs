import { describe, expect, it } from 'vitest';
import {
  parseStudentFinanceSubTab,
  STUDENT_FINANCE_SUB_TABS,
} from './student-finance-sub-tab';

describe('parseStudentFinanceSubTab', () => {
  it('keeps the five active finance surfaces', () => {
    expect(STUDENT_FINANCE_SUB_TABS).toEqual([
      'overview',
      'agreements',
      'schedule',
      'collections',
      'historical',
    ]);
    expect(parseStudentFinanceSubTab('schedule')).toBe('schedule');
    expect(parseStudentFinanceSubTab('collections')).toBe('collections');
  });

  it('redirects removed and merged finance sub-tabs', () => {
    expect(parseStudentFinanceSubTab('fees')).toBe('agreements');
    expect(parseStudentFinanceSubTab('adjustments')).toBe('agreements');
    expect(parseStudentFinanceSubTab('ledger')).toBe('historical');
    expect(parseStudentFinanceSubTab('cheques')).toBe('collections');
  });

  it('redirects legacy agreement section and invalid values', () => {
    expect(parseStudentFinanceSubTab('agreement')).toBe('agreements');
    expect(parseStudentFinanceSubTab('unknown')).toBe('overview');
    expect(parseStudentFinanceSubTab(null)).toBe('overview');
  });
});
