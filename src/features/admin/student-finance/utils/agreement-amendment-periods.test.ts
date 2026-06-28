import { describe, expect, it } from 'vitest';
import {
  mergeAgreementAmendmentPeriodOptions,
  normalizeAgreementAmendmentPeriodOptions,
} from './normalize-agreement-amendment-period-options';
import {
  scanRangeForAcademicYear,
  readAgreementLineBootstrap,
} from './agreement-amendment-period-bootstrap';
import type { FinancialAgreement } from '../types';

describe('normalizeAgreementAmendmentPeriodOptions', () => {
  it('uses billing period id and label from Odoo records', () => {
    const options = normalizeAgreementAmendmentPeriodOptions([
      {
        id: 300,
        period_key: '2027-06',
        label: 'يونيو 2027',
        period_start: '2027-06-01',
        period_end: '2027-06-30',
      },
    ]);
    expect(options).toEqual([
      {
        id: 300,
        label: 'يونيو 2027',
        periodKey: '2027-06',
        periodStart: '2027-06-01',
        periodEnd: '2027-06-30',
        sequence: null,
        selectable: true,
        disabledReason: null,
      },
    ]);
  });

  it('does not treat month labels without ids as options', () => {
    expect(normalizeAgreementAmendmentPeriodOptions(['2027-06', '2026-09'])).toEqual([]);
  });

  it('preserves camelCase period fields when re-normalizing API data', () => {
    const options = normalizeAgreementAmendmentPeriodOptions([
      { id: 298, label: 'أبريل 2027', periodKey: '2027-04', periodStart: '2027-04-01' },
      { id: 291, label: 'شتنبر 2026', periodKey: '2026-09', periodStart: '2026-09-01' },
    ]);
    expect(options.map((item) => item.id)).toEqual([291, 298]);
    expect(options[0]?.periodStart).toBe('2026-09-01');
  });
});

describe('mergeAgreementAmendmentPeriodOptions', () => {
  it('dedupes by billing period id', () => {
    const merged = mergeAgreementAmendmentPeriodOptions(
      [{ id: 291, label: 'A', periodKey: '2026-09' }],
      [{ id: 291, label: 'B', periodKey: '2026-09' }, { id: 292, label: 'C', periodKey: '2026-10' }],
    );
    expect(merged.map((item) => item.id)).toEqual([291, 292]);
    expect(merged[0]?.label).toBe('A');
  });
});

describe('resolve-agreement-amendment-effective-periods helpers', () => {
  it('computes scan range from academic year id', () => {
    expect(scanRangeForAcademicYear(1)).toEqual({ start: 250, end: 370 });
  });

  it('reads bootstrap line with fee_type_id from service_id', () => {
    const line = readAgreementLineBootstrap({
      id: 590,
      student_id: 2436,
      state: 'active',
      lines: [{ id: 1005, service_id: 1310, net_amount: 400, service: { id: 1310, name: 'Transport' } }],
    } as FinancialAgreement);
    expect(line).toEqual({ source_line_id: 1005, fee_type_id: 1310, amount: 400 });
  });
});
