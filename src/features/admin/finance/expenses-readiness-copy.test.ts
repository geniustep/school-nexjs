import { describe, expect, it } from 'vitest';
import { EXPENSES_READINESS_COPY, EXPENSES_READINESS_LOCALES, expensesReadinessCopy } from './expenses-readiness-copy';

describe('Expenses V1 readiness — four locales', () => {
  it('has all four supported languages', () => {
    expect([...EXPENSES_READINESS_LOCALES]).toEqual(['ar', 'fr', 'en', 'es']);
  });
  it('does not leave any key untranslated', () => {
    const referenceKeys = Object.keys(EXPENSES_READINESS_COPY.ar).sort();
    for (const locale of EXPENSES_READINESS_LOCALES) {
      expect(Object.keys(expensesReadinessCopy(locale)).sort()).toEqual(referenceKeys);
      for (const value of Object.values(expensesReadinessCopy(locale))) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
