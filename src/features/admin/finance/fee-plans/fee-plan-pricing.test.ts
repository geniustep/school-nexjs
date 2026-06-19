import { describe, expect, it } from 'vitest';
import { buildLinePayload } from './fee-plan-payload';
import { newDraftLine } from './fee-plan-types';
import {
  computeDraftLineExpectedTotal,
  computePlanFinancialBreakdown,
  inferDefaultPricingMode,
  normalizePricingMode,
  pricingModeDisplayKey,
  resolveLineExpectedTotal,
  resolveLinePricing,
  validateDraftLinePricing,
} from './fee-plan-pricing';
import { resolveAssignErrorMessage } from '@/features/admin/finance/fee-plan-assign-errors';
import type { FeePlanLine } from '@/types/finance';

describe('normalizePricingMode', () => {
  it('accepts supported modes', () => {
    expect(normalizePricingMode('recurring_unit_price')).toBe('recurring_unit_price');
    expect(normalizePricingMode('total_amount_installments')).toBe('total_amount_installments');
    expect(normalizePricingMode('unknown')).toBeNull();
  });
});

describe('pricingModeDisplayKey', () => {
  it('labels recurring_unit_price as monthly recurring', () => {
    expect(
      pricingModeDisplayKey({ frequency: 'monthly', pricingMode: 'recurring_unit_price' }),
    ).toBe('admin.finance.feePlansWorkspace.pricing.monthlyRecurringBadge');
  });

  it('labels total_amount_installments separately', () => {
    expect(
      pricingModeDisplayKey({ frequency: 'monthly', pricingMode: 'total_amount_installments' }),
    ).toBe('admin.finance.feePlansWorkspace.pricing.installmentTotalBadge');
  });

  it('labels one-time frequency as one-time fee', () => {
    expect(
      pricingModeDisplayKey({ frequency: 'one_time', pricingMode: 'total_amount_installments' }),
    ).toBe('admin.finance.feePlansWorkspace.pricing.oneTimeBadge');
  });
});

describe('resolveLineExpectedTotal', () => {
  it('uses API expected_total when present', () => {
    const line: FeePlanLine = {
      id: 1,
      amount: 2000,
      is_optional: false,
      fee_type_id: 1,
      frequency: 'monthly',
      installment_count: 10,
      pricing_mode: 'recurring_unit_price',
      expected_total: 20000,
      installment_amount: 2000,
    };
    expect(resolveLineExpectedTotal(line)).toBe(20000);
  });

  it('computes recurring monthly legacy fallback', () => {
    const line: FeePlanLine = {
      id: 2,
      amount: 2000,
      is_optional: false,
      fee_type_id: 2,
      frequency: 'monthly',
      installment_count: 10,
    };
    expect(resolveLineExpectedTotal(line)).toBe(20000);
  });

  it('keeps total_amount_installments lump sum', () => {
    const line: FeePlanLine = {
      id: 3,
      amount: 3000,
      is_optional: false,
      fee_type_id: 3,
      frequency: 'monthly',
      installment_count: 3,
      pricing_mode: 'total_amount_installments',
      expected_total: 3000,
      installment_amount: 1000,
    };
    const pricing = resolveLinePricing(line);
    expect(pricing.expectedTotal).toBe(3000);
    expect(pricing.installmentAmount).toBe(1000);
  });
});

describe('draft pricing payloads', () => {
  it('sends recurring_unit_price for monthly draft', () => {
    const line = {
      ...newDraftLine('c1'),
      feeTypeId: 1,
      amount: 2000,
      frequency: 'monthly',
      installmentCount: 10,
      pricingMode: 'recurring_unit_price' as const,
    };
    expect(buildLinePayload(line).pricing_mode).toBe('recurring_unit_price');
    expect(computeDraftLineExpectedTotal(line)).toBe(20000);
  });

  it('sends total_amount_installments for once draft', () => {
    const line = {
      ...newDraftLine('c2'),
      feeTypeId: 2,
      amount: 2500,
      frequency: 'once',
      installmentCount: 1,
    };
    expect(buildLinePayload(line).pricing_mode).toBe('total_amount_installments');
    expect(inferDefaultPricingMode('once')).toBe('total_amount_installments');
  });
});

describe('validateDraftLinePricing', () => {
  it('blocks once + recurring + multi installment', () => {
    const line = {
      ...newDraftLine('c3'),
      feeTypeId: 1,
      amount: 2500,
      frequency: 'once',
      installmentCount: 3,
      pricingMode: 'recurring_unit_price' as const,
    };
    expect(validateDraftLinePricing(line)).toBe(
      'admin.finance.feePlansWorkspace.errors.pricingInconsistent',
    );
  });
});

describe('computePlanFinancialBreakdown preview 22500', () => {
  it('sums registration and recurring tuition', () => {
    const breakdown = computePlanFinancialBreakdown([
      {
        id: 1,
        amount: 2500,
        is_optional: false,
        fee_type_id: 1,
        frequency: 'one_time',
        installment_count: 1,
        pricing_mode: 'total_amount_installments',
        expected_total: 2500,
      },
      {
        id: 2,
        amount: 2000,
        is_optional: false,
        fee_type_id: 2,
        frequency: 'monthly',
        installment_count: 10,
        pricing_mode: 'recurring_unit_price',
        expected_total: 20000,
        installment_amount: 2000,
      },
    ]);
    expect(breakdown.expectedTotal).toBe(22500);
  });
});

describe('resolveAssignErrorMessage', () => {
  it('maps duplicate business_error to Arabic key path', () => {
    const message = resolveAssignErrorMessage('business_error', 'Fee plan already assigned to student', (key) =>
      key === 'admin.finance.assignErrors.feePlanAlreadyAssigned' ? 'تم تطبيق هذه الخطة على التلميذ سابقًا.' : key,
    );
    expect(message).toBe('تم تطبيق هذه الخطة على التلميذ سابقًا.');
  });

  it('maps fee_plan_line_pricing_inconsistent', () => {
    const message = resolveAssignErrorMessage('fee_plan_line_pricing_inconsistent', '', (key) =>
      key === 'admin.finance.assignErrors.feePlanLinePricingInconsistent' ? 'pricing inconsistent' : key,
    );
    expect(message).toBe('pricing inconsistent');
  });
});

describe('billing profile assignment summary type', () => {
  it('accepts assignment response shape', () => {
    const profile = {
      id: 2379,
      created_automatically: true,
      billing_partner_id: 7080,
      billing_party_type: 'guardian' as const,
    };
    expect(profile.billing_party_type).toBe('guardian');
  });
});
