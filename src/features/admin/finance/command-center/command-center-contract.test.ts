import { describe, expect, it } from 'vitest';
import {
  appendAcademicYearToFinancePath,
  isCommandCenterPeriodReady,
  resolveCommandCenterPerformanceQuery,
  safeFinanceCommandCenterActionPath,
} from './command-center-contract';

describe('Finance Command Center contract helpers', () => {
  it('requires an academic year before any performance request', () => {
    expect(
      resolveCommandCenterPerformanceQuery(
        null,
        { preset: 'academic_year', dateFrom: '', dateTo: '' },
        '2026-10-02',
      ),
    ).toBeNull();
  });

  it('keeps academic-year performance backend-owned without local date bounds', () => {
    expect(
      resolveCommandCenterPerformanceQuery(
        7,
        { preset: 'academic_year', dateFrom: '', dateTo: '' },
        '2026-10-02',
      ),
    ).toEqual({ academic_year_id: 7 });
  });

  it('resolves this month from backend as_of_date rather than browser time', () => {
    expect(
      resolveCommandCenterPerformanceQuery(
        7,
        { preset: 'this_month', dateFrom: '', dateTo: '' },
        '2026-10-02',
      ),
    ).toEqual({
      academic_year_id: 7,
      date_from: '2026-10-01',
      date_to: '2026-10-02',
    });
  });

  it('resolves previous month boundaries from backend as_of_date', () => {
    expect(
      resolveCommandCenterPerformanceQuery(
        7,
        { preset: 'previous_month', dateFrom: '', dateTo: '' },
        '2026-03-03',
      ),
    ).toEqual({
      academic_year_id: 7,
      date_from: '2026-02-01',
      date_to: '2026-02-28',
    });
  });

  it('fails closed on incomplete or inverted custom periods', () => {
    expect(
      resolveCommandCenterPerformanceQuery(
        7,
        { preset: 'custom', dateFrom: '2026-10-10', dateTo: '2026-10-01' },
        '2026-10-02',
      ),
    ).toBeNull();
    expect(
      isCommandCenterPeriodReady(
        { preset: 'custom', dateFrom: '2026-10-01', dateTo: '' },
        '2026-10-02',
      ),
    ).toBe(false);
  });

  it('accepts only local finance drill-down paths', () => {
    expect(safeFinanceCommandCenterActionPath('/admin/finance/arrears')).toBe(
      '/admin/finance/arrears',
    );
    expect(
      safeFinanceCommandCenterActionPath('/admin/finance/installments?quick=due_next_7_days'),
    ).toBe('/admin/finance/installments?quick=due_next_7_days');
    expect(safeFinanceCommandCenterActionPath('https://evil.example/admin/finance')).toBeNull();
    expect(safeFinanceCommandCenterActionPath('/admin/students')).toBeNull();
    expect(safeFinanceCommandCenterActionPath('/admin/financeevil')).toBeNull();
    expect(safeFinanceCommandCenterActionPath('//evil.example/admin/finance')).toBeNull();
  });

  it('adds academic year to safe backend action paths without overriding it', () => {
    expect(
      appendAcademicYearToFinancePath('/admin/finance/arrears', 9),
    ).toBe('/admin/finance/arrears?academic_year_id=9');
    expect(
      appendAcademicYearToFinancePath(
        '/admin/finance/installments?quick=due_next_7_days&academic_year_id=3',
        9,
      ),
    ).toBe('/admin/finance/installments?quick=due_next_7_days&academic_year_id=3');
  });
});
