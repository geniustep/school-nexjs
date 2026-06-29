import { describe, expect, it } from 'vitest';
import {
  filterPeriodAmendableLineOptions,
  isMonthlyAgreementLine,
  isOneTimeAgreementLine,
} from './agreement-amendment-line-eligibility';
import { formatAmendmentLineOptionLabel } from './agreement-amendment-line-labels';
import {
  isBlockedByOneTimeLineNotPeriodAmendable,
  shouldShowAgreementAmendmentAllowedStatus,
  shouldShowAgreementAmendmentLegacyAmounts,
} from './agreement-amendment-pricing-contract';
import { normalizeAgreementAmendmentPreview } from './normalize-agreement-amendment-preview';
import { resolveAmendmentAgreementLineOptions } from './resolve-amendment-form-options';
import type { FinancialAgreement } from '../types';

const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'admin.student360.financeWorkspace.agreementAmendment.notAllowedTitle': 'غير مسموح بالتطبيق',
    'admin.student360.financeWorkspace.agreementAmendment.lineOptions.monthly': '{label} — شهري',
    'admin.student360.financeWorkspace.agreementAmendment.lineOptions.oneTimeDisabled':
      '{label} — مرة واحدة، لا يُعدّل من شهر',
    'admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPrice':
      'السعر الشهري الجديد',
  };
  const template = translations[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (value, [paramKey, paramValue]) => value.replace(`{${paramKey}}`, String(paramValue)),
    template,
  );
};

const schoolAgreement = {
  id: 590,
  student_id: 2436,
  state: 'active',
  lines: [
    {
      id: 1003,
      service_id: 1308,
      service_name: 'التسجيل',
      commitment_type: 'one_time',
      pricing_unit: 'academic_year',
      net_amount: 2500,
    },
    {
      id: 1004,
      service_id: 1309,
      service_name: 'التمدرس',
      commitment_type: 'renewable_subscription',
      pricing_unit: 'month',
      net_amount: 2000,
    },
    {
      id: 1005,
      service_id: 1310,
      service_name: 'النقل',
      commitment_type: 'renewable_subscription',
      pricing_unit: 'month',
      net_amount: 400,
    },
  ],
} as FinancialAgreement;

describe('agreement amendment one-time line UX', () => {
  it('1) keeps legacy one-time lines out of period-only filter but amount-amendable lines stay in full list', () => {
    const allLines = resolveAmendmentAgreementLineOptions({
      ...schoolAgreement,
      lines: [
        ...(schoolAgreement.lines ?? []),
        {
          id: 1006,
          service_name: 'رسوم التسجيل الجديدة',
          commitment_type: 'one_time',
          pricing_unit: 'academic_year',
          period_amendable: false,
          amount_amendable: true,
          supported_amendment_operations: ['adjust_line_amount'],
        },
      ],
    });
    const selectable = filterPeriodAmendableLineOptions(allLines);
    expect(selectable.map((line) => line.id)).toEqual([1004, 1005]);
    const amountAmendable = allLines.find((line) => line.id === 1006);
    expect(amountAmendable?.amountAmendable).toBe(true);
  });

  it('2) hides one-time lines from cancel_line selectable options', () => {
    const selectable = filterPeriodAmendableLineOptions(resolveAmendmentAgreementLineOptions(schoolAgreement));
    expect(selectable.every((line) => line.isOneTime !== true)).toBe(true);
  });

  it('3) keeps monthly lines visible with monthly suffix label', () => {
    const transport = resolveAmendmentAgreementLineOptions(schoolAgreement).find((line) => line.id === 1005);
    expect(transport?.isMonthly).toBe(true);
    expect(formatAmendmentLineOptionLabel(transport!, t)).toBe('النقل — شهري');
  });

  it('4) one_time_line_not_period_amendable shows a clear blocking message', () => {
    const preview = normalizeAgreementAmendmentPreview({
      allowed: false,
      blocking_reasons: [
        {
          code: 'one_time_line_not_period_amendable',
          message: 'بند التسجيل هو بند مرة واحدة ولا يمكن تعديله من شهر فعالية.',
        },
      ],
    });
    expect(isBlockedByOneTimeLineNotPeriodAmendable(preview)).toBe(true);
    expect(preview.blockingReasons[0]?.message).toContain('بند مرة واحدة');
  });

  it('5) one_time_line_not_period_amendable does not show misleading 0/0 amounts', () => {
    const preview = normalizeAgreementAmendmentPreview({
      allowed: false,
      blocking_reasons: [{ code: 'one_time_line_not_period_amendable' }],
      amount_before: 0,
      amount_after: 0,
      delta: 0,
    });
    expect(shouldShowAgreementAmendmentLegacyAmounts(preview)).toBe(false);
  });

  it('6) blocked preview hides allowed/blocked status row', () => {
    const preview = normalizeAgreementAmendmentPreview({
      allowed: false,
      blocking_reasons: [{ code: 'one_time_line_not_period_amendable' }],
    });
    expect(shouldShowAgreementAmendmentAllowedStatus(preview)).toBe(false);
  });

  it('7) monthly new unit price applies only to monthly lines', () => {
    const lines = resolveAmendmentAgreementLineOptions(schoolAgreement);
    const registration = lines.find((line) => line.id === 1003);
    const transport = lines.find((line) => line.id === 1005);
    expect(registration?.isOneTime).toBe(true);
    expect(registration?.isMonthly).toBe(false);
    expect(transport?.isOneTime).toBe(false);
    expect(transport?.isMonthly).toBe(true);
    expect(t('admin.student360.financeWorkspace.agreementAmendment.fields.monthlyNewUnitPrice')).toBe(
      'السعر الشهري الجديد',
    );
  });

  it('detects school registration line as one-time via academic_year pricing unit', () => {
    expect(
      isOneTimeAgreementLine({
        commitment_type: 'one_time',
        pricing_unit: 'academic_year',
      }),
    ).toBe(true);
    expect(
      isMonthlyAgreementLine({
        commitment_type: 'renewable_subscription',
        pricing_unit: 'month',
      }),
    ).toBe(true);
  });

  it('labels one-time line for disabled display when metadata exists', () => {
    const registration = resolveAmendmentAgreementLineOptions(schoolAgreement).find((line) => line.id === 1003);
    expect(formatAmendmentLineOptionLabel(registration!, t)).toContain('مرة واحدة');
  });
});
