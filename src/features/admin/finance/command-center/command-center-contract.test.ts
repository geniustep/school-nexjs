import { describe, expect, it } from 'vitest';
import {
  FINANCE_COMMAND_CENTER_DRILLDOWN_API,
  appendAcademicYearToFinancePath,
  isCommandCenterPeriodReady,
  resolveCommandCenterPerformanceQuery,
  resolveFinanceCommandCenterDrilldownQuery,
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

  it('accepts only local finance action paths', () => {
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

  it('accepts backend-owned exact aging drill-down buckets', () => {
    for (const bucket of ['current', '1_30', '31_60', '61_90', '90_plus']) {
      expect(
        resolveFinanceCommandCenterDrilldownQuery(
          {
            endpoint: FINANCE_COMMAND_CENTER_DRILLDOWN_API,
            query: { academic_year_id: '9', metric_key: 'aging', aging_bucket: bucket },
          },
          9,
        ),
      ).toEqual({
        academic_year_id: 9,
        metric_key: 'aging',
        aging_bucket: bucket,
      });
    }
  });

  it('preserves the backend period for collection-performance drill-down', () => {
    expect(
      resolveFinanceCommandCenterDrilldownQuery(
        {
          endpoint: FINANCE_COMMAND_CENTER_DRILLDOWN_API,
          query: {
            academic_year_id: '9',
            metric_key: 'collection_performance',
            period: '2026-10',
          },
        },
        9,
      ),
    ).toEqual({
      academic_year_id: 9,
      metric_key: 'collection_performance',
      period: '2026-10',
    });
  });

  it('fails closed on arbitrary endpoint, academic year mismatch, or invalid bucket', () => {
    expect(
      resolveFinanceCommandCenterDrilldownQuery(
        {
          endpoint: 'https://evil.example/api/v1/admin/finance/command-center/drilldown',
          query: { academic_year_id: '9', metric_key: 'overdue' },
        },
        9,
      ),
    ).toBeNull();
    expect(
      resolveFinanceCommandCenterDrilldownQuery(
        {
          endpoint: FINANCE_COMMAND_CENTER_DRILLDOWN_API,
          query: { academic_year_id: '8', metric_key: 'overdue' },
        },
        9,
      ),
    ).toBeNull();
    expect(
      resolveFinanceCommandCenterDrilldownQuery(
        {
          endpoint: FINANCE_COMMAND_CENTER_DRILLDOWN_API,
          query: { academic_year_id: '9', metric_key: 'aging', aging_bucket: 'overdue_unpaid' },
        },
        9,
      ),
    ).toBeNull();
  });
});
