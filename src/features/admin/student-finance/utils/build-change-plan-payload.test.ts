import { describe, expect, it } from 'vitest';
import {
  buildReplaceIfUnpaidApplyPayload,
  buildReplaceIfUnpaidPreviewPayload,
  buildSocialDiscountApplyPayload,
  buildSocialDiscountPreviewPayload,
  monthPeriodsFromRange,
} from './build-change-plan-payload';

describe('build-change-plan-payload', () => {
  it('builds replace_if_unpaid preview without confirm flag', () => {
    expect(
      buildReplaceIfUnpaidPreviewPayload({
        newFeePlanId: '2967',
        activationMode: 'draft',
        changeReason: 'plan_correction',
        confirmReplace: false,
      }),
    ).toEqual({
      mode: 'replace_if_unpaid',
      new_fee_plan_id: 2967,
      activation_mode: 'draft',
      confirm_replace_current_agreement: false,
      change_reason: 'plan_correction',
    });
  });

  it('builds replace_if_unpaid apply with confirm flag', () => {
    expect(
      buildReplaceIfUnpaidApplyPayload({
        newFeePlanId: '2967',
        activationMode: 'activate',
        changeReason: 'plan_correction',
        confirmReplace: true,
      }),
    ).toEqual({
      mode: 'replace_if_unpaid',
      new_fee_plan_id: 2967,
      activation_mode: 'activate',
      confirm_replace_current_agreement: true,
      change_reason: 'plan_correction',
    });
  });

  it('builds social discount preview payload', () => {
    expect(
      buildSocialDiscountPreviewPayload({
        effectiveDate: '2026-02-01',
        feeTypeCode: 'tuition',
        discountType: 'percent',
        discountValue: '50',
        reasonNote: 'حالة اجتماعية',
        affectedPeriods: ['2026-02', '2026-03'],
        confirmFinancialImpact: false,
      }),
    ).toEqual({
      mode: 'social_discount_on_future_installments',
      effective_date: '2026-02-01',
      change_reason: 'social_case',
      reason_note: 'حالة اجتماعية',
      discounts: [
        { fee_type_code: 'TUITION', type: 'percent', value: 50, discount_type: 'social' },
      ],
      affected_periods: ['2026-02', '2026-03'],
      confirm_financial_impact: false,
    });
  });

  it('builds social discount apply with confirm_financial_impact', () => {
    expect(
      buildSocialDiscountApplyPayload({
        effectiveDate: '2026-02-01',
        feeTypeCode: 'tuition',
        discountType: 'percent',
        discountValue: '50',
        reasonNote: 'حالة اجتماعية',
        affectedPeriods: ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
        confirmFinancialImpact: true,
      }).confirm_financial_impact,
    ).toBe(true);
  });

  it('derives month periods from range', () => {
    expect(monthPeriodsFromRange('2026-02', '2026-04')).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });
});
