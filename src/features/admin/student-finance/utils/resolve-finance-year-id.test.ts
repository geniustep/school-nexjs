import { describe, expect, it } from 'vitest';
import { resolveFinanceYearId } from './resolve-finance-year-id';

describe('resolveFinanceYearId', () => {
  const details = {
    current_enrollment: { academic_year: { id: 42, name: '2025-2026' } },
  } as Parameters<typeof resolveFinanceYearId>[0];

  it('prefers explicit selection', () => {
    expect(resolveFinanceYearId(details, [{ id: 1 }], '99')).toBe('99');
  });

  it('uses enrollment year before academic years list loads', () => {
    expect(resolveFinanceYearId(details, [], '')).toBe('42');
  });

  it('falls back to current academic year when no enrollment', () => {
    const emptyDetails = {} as Parameters<typeof resolveFinanceYearId>[0];
    expect(
      resolveFinanceYearId(emptyDetails, [
        { id: 1, is_current: false },
        { id: 2, is_current: true },
      ], ''),
    ).toBe('2');
  });
});
