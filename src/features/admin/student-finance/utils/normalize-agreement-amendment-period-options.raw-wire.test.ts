import { describe, expect, it } from 'vitest';
import { normalizeAgreementAmendmentPeriodOptions } from './normalize-agreement-amendment-period-options';

describe('normalizeAgreementAmendmentPeriodOptions raw Odoo wire contract', () => {
  it('normalizes top-level periods and snake_case boundaries', () => {
    const raw = {
      success: true,
      agreement_id: 166,
      student_id: 1853,
      academic_year_id: 1,
      periods: [
        {
          id: 292,
          effective_period_id: 292,
          period_key: '2026-10',
          label: 'October 2026',
          period_start: '2026-10-01',
          period_end: '2026-10-31',
          due_date: '2026-10-05',
        },
      ],
    };

    expect(normalizeAgreementAmendmentPeriodOptions(raw)).toEqual([
      expect.objectContaining({
        id: 292,
        label: 'October 2026',
        periodKey: '2026-10',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        selectable: true,
      }),
    ]);
  });
});
