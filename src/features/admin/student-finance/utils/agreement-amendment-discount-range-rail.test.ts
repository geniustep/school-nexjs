import { describe, expect, it } from 'vitest';
import { resolveAgreementAmendmentErrorMessage } from './agreement-amendment-errors';
import {
  isLineSelectableForAmountAmendment,
  lineSupportsAdjustLineAmount,
  resolveAmountAmendableFromLine,
  resolveSupportedAmendmentOperationsFromLine,
} from './agreement-amendment-line-eligibility';
import {
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
  usesPeriodRangeForForm,
} from './build-agreement-amendment-payload';
import {
  computeAmountAdjustmentDelta,
  resolveAvailableAmendmentPaths,
  resolveDefaultAmendmentPath,
} from './agreement-amendment-path';
import {
  resolveAgreementAmendmentPricingContractLabelKeys,
  resolveAgreementAmendmentPricingContractLabelMode,
} from './agreement-amendment-pricing-contract';
import { resolveAmendmentAgreementLineOptions } from './resolve-amendment-form-options';
import { sortAgreementAmendmentPeriodOptions } from './sort-agreement-amendment-period-options';
import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';

const registrationLineAgreement = {
  id: 4,
  student_id: 5,
  state: 'active',
  lines: [
    {
      source_line_id: 12,
      agreement_line_id: 12,
      service_name: 'رسوم التسجيل',
      commitment_type: 'one_time',
      pricing_unit: 'academic_year',
      period_amendable: false,
      amendment_block_reason: 'one_time_line_not_period_amendable',
      amount_amendable: true,
      amount_amendment_block_reason: null,
      supported_amendment_operations: ['adjust_line_amount'],
      unit_price: 2300,
      net_amount: 2300,
    },
    {
      source_line_id: 13,
      agreement_line_id: 13,
      service_name: 'رسوم التمدرس',
      commitment_type: 'renewable_subscription',
      pricing_unit: 'month',
      period_amendable: true,
      amount_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
      operational_state: 'active_current',
      is_in_current_schedule: true,
      open_installment_count: 10,
      can_modify: true,
      can_cancel_line: true,
      unit_price: 2000,
      net_amount: 2000,
    },
  ],
} as unknown as FinancialAgreement;

describe('agreement amendment discount and range rail UX', () => {
  it('reads amount_amendable and supported_amendment_operations from Odoo line metadata', () => {
    const registration = registrationLineAgreement.lines![0] as Record<string, unknown>;
    expect(resolveAmountAmendableFromLine(registration)).toBe(true);
    expect(resolveSupportedAmendmentOperationsFromLine(registration)).toEqual(['adjust_line_amount']);

    const lines = resolveAmendmentAgreementLineOptions(registrationLineAgreement);
    expect(lines[0]?.amountAmendable).toBe(true);
    expect(lines[0]?.supportedAmendmentOperations).toEqual(['adjust_line_amount']);
    expect(lines[1]?.supportedAmendmentOperations).toEqual(['modify_line', 'cancel_line']);
  });

  it('one-time amount-amendable line exposes adjust_amount path only', () => {
    const line = resolveAmendmentAgreementLineOptions(registrationLineAgreement)[0]!;
    expect(lineSupportsAdjustLineAmount(line)).toBe(true);
    expect(resolveAvailableAmendmentPaths(line, 'modify_line')).toEqual(['adjust_amount']);
    expect(resolveDefaultAmendmentPath(line, 'modify_line')).toBe('adjust_amount');
    expect(isLineSelectableForAmountAmendment(line)).toBe(true);
  });

  it('adjust_line_amount path does not require effective period', () => {
    const line = resolveAmendmentAgreementLineOptions(registrationLineAgreement)[0]!;
    const form: AgreementAmendmentFormState = {
      operationType: 'modify_line',
      amendmentPath: 'adjust_amount',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      reason: 'تخفيض استثنائي لرسوم التسجيل',
      sourceLineId: String(line.id),
      feeTypeId: '',
      amount: '1800',
    };

    expect(usesPeriodRangeForForm(form)).toBe(false);
    expect(canSubmitAgreementAmendmentForm(form, line)).toBe(true);

    const payload = buildAgreementAmendmentPreviewPayload(4, form, line);
    expect(payload).toEqual({
      agreement_id: 4,
      operation_type: 'adjust_line_amount',
      reason: 'تخفيض استثنائي لرسوم التسجيل',
      line: {
        source_line_id: 12,
        agreement_line_id: 12,
        new_unit_price: 1800,
      },
    });
    expect('effective_period_id' in payload).toBe(false);
  });

  it('monthly line uses period_range path and requires start month', () => {
    const line = resolveAmendmentAgreementLineOptions(registrationLineAgreement)[1]!;
    const form: AgreementAmendmentFormState = {
      operationType: 'modify_line',
      amendmentPath: 'period_range',
      effectivePeriodId: '101',
      effectivePeriodEndId: '110',
      reason: 'QA monthly change',
      sourceLineId: String(line.id),
      feeTypeId: '',
      amount: '1800',
    };

    expect(usesPeriodRangeForForm(form)).toBe(true);
    expect(canSubmitAgreementAmendmentForm(form, line)).toBe(true);

    const payload = buildAgreementAmendmentPreviewPayload(4, form, line);
    expect(payload.operation_type).toBe('modify_line');
    expect(payload.effective_period_id).toBe(101);
    expect('effective_period_end_id' in payload).toBe(false);
  });

  it('blocks preview when reason or new amount is missing for adjust path', () => {
    const line = resolveAmendmentAgreementLineOptions(registrationLineAgreement)[0]!;
    const incomplete: AgreementAmendmentFormState = {
      operationType: 'modify_line',
      amendmentPath: 'adjust_amount',
      effectivePeriodId: '',
      effectivePeriodEndId: '',
      reason: '',
      sourceLineId: String(line.id),
      feeTypeId: '',
      amount: '1800',
    };
    expect(canSubmitAgreementAmendmentForm(incomplete, line)).toBe(false);
    expect(canSubmitAgreementAmendmentForm({ ...incomplete, reason: 'ok', amount: '' }, line)).toBe(
      false,
    );
  });

  it('surfaces line_has_confirmed_collections via i18n', () => {
    const message = resolveAgreementAmendmentErrorMessage(
      'line_has_confirmed_collections',
      'raw',
      (key) =>
        key.endsWith('line_has_confirmed_collections')
          ? 'توجد تحصيلات مؤكدة تمنع تعديل مبلغ هذا البند'
          : key,
    );
    expect(message).toContain('تحصيلات مؤكدة');
  });

  it('maps new adjust_line_amount error codes to reasonCodes keys', () => {
    expect(
      resolveAgreementAmendmentErrorMessage('new_unit_price_required', undefined, (key) =>
        key.endsWith('new_unit_price_required') ? 'يجب إدخال المبلغ الجديد.' : key,
      ),
    ).toBe('يجب إدخال المبلغ الجديد.');
  });

  it('range rail periods sort chronologically by sequence then periodStart', () => {
    const sorted = sortAgreementAmendmentPeriodOptions([
      { id: 3, label: 'يونيو 2027', sequence: 3, periodStart: '2027-06-01' },
      { id: 1, label: 'شتنبر 2026', sequence: 1, periodStart: '2026-09-01' },
      { id: 2, label: 'أكتوبر 2026', sequence: 2, periodStart: '2026-10-01' },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('computeAmountAdjustmentDelta distinguishes decrease and increase', () => {
    expect(computeAmountAdjustmentDelta(2300, '1800')).toEqual({ diff: -500, kind: 'decrease' });
    expect(computeAmountAdjustmentDelta(2300, '2500')).toEqual({ diff: 200, kind: 'increase' });
  });

  it('legacy one-time line without amount_amendable stays blocked for amount path', () => {
    const legacy = resolveAmendmentAgreementLineOptions({
      id: 1,
      lines: [
        {
          id: 50,
          service_name: 'رسوم التسجيل',
          period_amendable: false,
          commitment_type: 'one_time',
          pricing_unit: 'academic_year',
        },
      ],
    } as FinancialAgreement)[0]!;

    expect(legacy.amountAmendable).toBe(false);
    expect(resolveAvailableAmendmentPaths(legacy, 'modify_line')).toEqual([]);
  });

  it('line blocked by amount_amendment_block_reason is not amount selectable', () => {
    const blocked = resolveAmendmentAgreementLineOptions({
      id: 1,
      student_id: 5,
      state: 'active',
      lines: [
        {
          source_line_id: 12,
          service_name: 'رسوم التسجيل',
          period_amendable: false,
          amount_amendable: false,
          amount_amendment_block_reason: 'line_has_confirmed_collections',
          supported_amendment_operations: ['adjust_line_amount'],
        },
      ],
    } as unknown as FinancialAgreement)[0]!;

    expect(isLineSelectableForAmountAmendment(blocked)).toBe(false);
    expect(blocked.amountAmendmentBlockReason).toBe('line_has_confirmed_collections');
  });

  it('adjust_line_amount pricing contract labels avoid monthly wording', () => {
    const t = (key: string) =>
      ({
        'admin.student360.financeWorkspace.agreementAmendment.pricingContract.titleLineAmount':
          'مبلغ البند',
        'admin.student360.financeWorkspace.agreementAmendment.pricingContract.lineCurrentAmount':
          'المبلغ الحالي',
        'admin.student360.financeWorkspace.agreementAmendment.pricingContract.lineNewAmount':
          'المبلغ الجديد',
        'admin.student360.financeWorkspace.agreementAmendment.pricingContract.deltaTotal':
          'الفرق',
        'admin.student360.financeWorkspace.agreementAmendment.pricingContract.monthlyCurrentUnitPrice':
          'السعر الشهري الحالي',
      })[key] ?? key;

    expect(resolveAgreementAmendmentPricingContractLabelMode('modify_line', 'adjust_amount')).toBe(
      'line_amount',
    );
    const labels = resolveAgreementAmendmentPricingContractLabelKeys('line_amount');
    expect(t(labels.currentUnitPrice)).toBe('المبلغ الحالي');
    expect(t(labels.newUnitPrice)).toBe('المبلغ الجديد');
    expect(t(labels.currentUnitPrice)).not.toMatch(/السعر الشهري/);
  });
});
