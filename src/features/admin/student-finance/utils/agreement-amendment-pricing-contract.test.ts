import { describe, expect, it } from 'vitest';
import {
  filterPeriodAmendableLineOptions,
  isOneTimeAgreementLine,
} from './agreement-amendment-line-eligibility';
import { formatAmendmentEffectivePeriodLabel } from './agreement-amendment-period-labels';
import {
  isBlockedByOneTimeLineNotPeriodAmendable,
  normalizeAgreementAmendmentPricingContract,
  shouldShowAgreementAmendmentLegacyAmounts,
} from './agreement-amendment-pricing-contract';
import { normalizeAgreementAmendmentPreview } from './normalize-agreement-amendment-preview';
import {
  readAgreementAmendmentWarnings,
  resolveAgreementAmendmentBlockingMessage,
  resolveAgreementAmendmentWarningMessage,
} from './resolve-agreement-amendment-warning';
import { resolveAmendmentAgreementLineOptions } from './resolve-amendment-form-options';
import type { FinancialAgreement } from '../types';
import type { NormalizedAgreementAmendmentPreview } from '../types/agreement-amendment';

const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'admin.student360.financeWorkspace.agreementAmendment.effectivePeriod': 'يبدأ التعديل من شهر',
    'admin.student360.financeWorkspace.agreementAmendment.effectivePeriodHint':
      'سيُطبّق التعديل من هذا الشهر إلى نهاية الاتفاق، فقط على الأشهر المفتوحة وغير المؤداة.',
    'admin.student360.financeWorkspace.agreementAmendment.effectivePeriodOptionLabel':
      '{label} وما بعده',
    'admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPrice':
      'السعر الشهري الجديد',
    'admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPriceHint':
      'هذا السعر سيُطبّق على كل شهر متبقٍ ابتداءً من شهر البداية.',
    'admin.student360.financeWorkspace.agreementAmendment.reasonCodes.one_time_line_not_period_amendable':
      'بند التسجيل هو بند مرة واحدة ولا يمكن تعديله من شهر فعالية.',
    'admin.student360.financeWorkspace.agreementAmendment.reasonCodes.monthly_unit_price_seems_high':
      'تنبيه: أدخلت {newUnitPrice} كسعر شهري جديد على {affectedPeriodCount} أشهر.',
    'admin.student360.financeWorkspace.agreementAmendment.pricingContract.currentUnitPrice':
      'السعر الحالي للشهر',
  };

  const template = translations[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (value, [paramKey, paramValue]) => value.replace(`{${paramKey}}`, String(paramValue)),
    template,
  );
};

describe('agreement amendment pricing contract UI', () => {
  it('1) effective period label is "يبدأ التعديل من شهر"', () => {
    expect(t('admin.student360.financeWorkspace.agreementAmendment.effectivePeriod')).toBe(
      'يبدأ التعديل من شهر',
    );
  });

  it('2) monthly amount label is "السعر الشهري الجديد"', () => {
    expect(t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPrice')).toBe(
      'السعر الشهري الجديد',
    );
  });

  it('3) shows hint that amendment applies from month through agreement end', () => {
    expect(t('admin.student360.financeWorkspace.agreementAmendment.effectivePeriodHint')).toContain(
      'من هذا الشهر إلى نهاية الاتفاق',
    );
    expect(t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPriceHint')).toContain(
      'كل شهر متبقٍ',
    );
  });

  it('4) normalizes and exposes pricing_contract from Odoo preview', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      pricing_contract: {
        current_unit_price: 2000,
        new_unit_price: 1800,
        affected_period_count: 10,
        current_total_for_affected_periods: 20000,
        new_total_for_affected_periods: 18000,
        delta_total: -2000,
      },
    });

    expect(normalized.pricingContract).toEqual({
      amountSemantics: null,
      currentUnitPrice: 2000,
      newUnitPrice: 1800,
      affectedPeriodCount: 10,
      currentTotalForAffectedPeriods: 20000,
      newTotalForAffectedPeriods: 18000,
      deltaTotal: -2000,
    });
    expect(shouldShowAgreementAmendmentLegacyAmounts(normalized)).toBe(false);
  });

  it('5) resolves monthly_unit_price_seems_high warning with pricing contract params', () => {
    const warnings = readAgreementAmendmentWarnings([
      { code: 'monthly_unit_price_seems_high' },
    ]);
    const contract = normalizeAgreementAmendmentPricingContract({
      new_unit_price: 18000,
      affected_period_count: 10,
      new_total_for_affected_periods: 180000,
    });

    const message = resolveAgreementAmendmentWarningMessage(warnings[0]!, t, contract);
    expect(message).toContain('18000');
    expect(message).toContain('10');
  });

  it('6) one_time_line_not_period_amendable hides zero legacy amounts and shows clear reason', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: false,
      reason: 'one_time_line_not_period_amendable',
      amount_before: 0,
      amount_after: 0,
      delta: 0,
    });

    expect(isBlockedByOneTimeLineNotPeriodAmendable(normalized)).toBe(true);
    expect(shouldShowAgreementAmendmentLegacyAmounts(normalized)).toBe(false);
    expect(
      resolveAgreementAmendmentBlockingMessage(
        { code: 'one_time_line_not_period_amendable', message: 'بند التسجيل هو بند مرة واحدة' },
        t,
      ),
    ).toContain('بند مرة واحدة');
  });

  it('7) filters one-time lines from period-based amendment options when metadata exists', () => {
    const agreement = {
      id: 1,
      student_id: 5,
      state: 'active',
      lines: [
        {
          id: 100,
          service_id: 10,
          service_name: 'التمدرس',
          commitment_type: 'renewable_subscription',
          pricing_unit: 'month',
          net_amount: 2000,
        },
        {
          id: 101,
          service_id: 11,
          service_name: 'التسجيل',
          commitment_type: 'one_time',
          pricing_unit: 'academic_year',
          net_amount: 2500,
        },
      ],
    } as FinancialAgreement;

    const allLines = resolveAmendmentAgreementLineOptions(agreement);
    expect(allLines.find((line) => line.id === 101)?.isOneTime).toBe(true);

    const periodLines = filterPeriodAmendableLineOptions(allLines);
    expect(periodLines.map((line) => line.id)).toEqual([100]);
    expect(isOneTimeAgreementLine({ commitment_type: 'one_time' })).toBe(true);
  });

  it('formats effective period options with "وما بعده"', () => {
    const label = formatAmendmentEffectivePeriodLabel(
      { id: 1, label: 'شتنبر 2026' },
      t,
    );
    expect(label).toBe('شتنبر 2026 وما بعده');
  });

  it('prefers Odoo warning message when provided', () => {
    const warnings = readAgreementAmendmentWarnings([
      {
        code: 'monthly_unit_price_seems_high',
        message: 'Odoo ready warning text',
      },
    ]);
    expect(
      resolveAgreementAmendmentWarningMessage(warnings[0]!, t, null),
    ).toBe('Odoo ready warning text');
  });

  it('does not invent pricing contract values when Odoo sends empty object', () => {
    expect(normalizeAgreementAmendmentPricingContract({})).toBeNull();
  });

  it('shows legacy amounts when pricing contract is absent and values are meaningful', () => {
    const preview = {
      allowed: true,
      amountBefore: 1000,
      amountAfter: 1200,
      delta: 200,
      currency: 'MAD',
      pricingContract: null,
      affectedPeriods: [],
      lockedPeriods: [],
      warnings: [],
      blockingReasons: [] as NormalizedAgreementAmendmentPreview['blockingReasons'],
      createdInstallments: [],
      updatedInstallments: [],
      cancelledInstallments: [],
      openPeriods: [],
    } satisfies NormalizedAgreementAmendmentPreview;

    expect(shouldShowAgreementAmendmentLegacyAmounts(preview)).toBe(true);
  });
});
