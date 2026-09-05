import { describe, expect, it } from 'vitest';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';
import {
  buildAgreementAmendmentPreviewPayload,
  isSingleInstallmentAmendmentForm,
} from './build-agreement-amendment-payload';
import { resolveOperationalInstallmentId } from './resolve-operational-installment-id';

const line: AgreementAmendmentLineOption = {
  id: 868,
  sourceLineId: 868,
  agreementLineId: 868,
  label: 'Transport',
  feeTypeId: 23,
  amount: 1800,
  unitPrice: 1800,
  quantity: 10,
  commitmentType: 'renewable_subscription',
  pricingUnit: 'month',
  periodAmendable: true,
  amendmentBlockReason: null,
  amountAmendable: true,
  amountAmendmentBlockReason: null,
  supportedAmendmentOperations: ['modify_line', 'adjust_line_amount'],
  duplicateServiceWarning: false,
  isMonthly: true,
  operationalState: 'active_current',
  isInCurrentSchedule: true,
  openInstallmentCount: 10,
  cancelledInstallmentCount: 0,
  historicalInstallmentCount: 0,
  canModify: true,
  canCancelLine: true,
  statusReasonCode: null,
};

const rangeForm: AgreementAmendmentFormState = {
  operationType: 'modify_line',
  amendmentPath: 'period_range',
  effectivePeriodId: '305',
  effectivePeriodEndId: '',
  reason: 'accord',
  sourceLineId: '868',
  feeTypeId: '23',
  amount: '900',
};

describe('single-installment amendment payload', () => {
  it('keeps the default month-and-later scope on modify_line', () => {
    expect(isSingleInstallmentAmendmentForm(rangeForm)).toBe(false);
    expect(buildAgreementAmendmentPreviewPayload(467, rangeForm, line)).toMatchObject({
      agreement_id: 467,
      operation_type: 'modify_line',
      effective_period_id: 305,
      line: { agreement_line_id: 868, source_line_id: 868, fee_type_id: 23, amount: 900 },
    });
  });

  it('maps start=end to adjust_installment_amount without repurposing amendmentPath', () => {
    const singleForm = { ...rangeForm, effectivePeriodEndId: '305' };
    expect(isSingleInstallmentAmendmentForm(singleForm)).toBe(true);
    expect(buildAgreementAmendmentPreviewPayload(467, singleForm, line)).toMatchObject({
      agreement_id: 467,
      operation_type: 'adjust_installment_amount',
      effective_period_id: 305,
      line: { agreement_line_id: 868, source_line_id: 868, fee_type_id: 23, amount: 900 },
    });
  });

  it('preserves the independent adjust_line_amount path', () => {
    const payload = buildAgreementAmendmentPreviewPayload(
      467,
      { ...rangeForm, amendmentPath: 'adjust_amount', effectivePeriodId: '', amount: '1500' },
      line,
    );
    expect(payload.operation_type).toBe('adjust_line_amount');
    expect(payload.line).toMatchObject({ agreement_line_id: 868, new_unit_price: 1500 });
    expect(payload.line).not.toHaveProperty('operational_installment_id');
  });
});

describe('canonical operational installment resolution', () => {
  const target = {
    agreementId: 467,
    agreementLineId: 868,
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
  };

  it('returns the exact school.installment id from agreement/line/period identity', () => {
    const result = resolveOperationalInstallmentId(
      [
        {
          id: 4733,
          agreement_id: 467,
          agreement_line_id: 868,
          period_start: '2026-09-01',
          period_end: '2026-09-30',
        },
        {
          id: 4734,
          agreement_id: 467,
          agreement_line_id: 868,
          period_start: '2026-10-01',
          period_end: '2026-10-31',
          timing_status: 'overdue',
        },
      ],
      target,
    );
    expect(result).toEqual({ ok: true, operationalInstallmentId: 4734 });
  });

  it('does not use overdue as a client-side lock', () => {
    const result = resolveOperationalInstallmentId(
      [
        {
          id: 4734,
          agreement_id: 467,
          agreement_line_id: 868,
          period_start: '2026-10-01',
          period_end: '2026-10-31',
          timing_status: 'overdue',
          payment_status: 'unpaid',
        },
      ],
      target,
    );
    expect(result.ok).toBe(true);
  });

  it('fails closed when the canonical match is missing or ambiguous', () => {
    expect(resolveOperationalInstallmentId([], target)).toEqual({ ok: false, reason: 'not_found' });
    const duplicate = {
      agreement_id: 467,
      agreement_line_id: 868,
      period_start: '2026-10-01',
      period_end: '2026-10-31',
    };
    expect(
      resolveOperationalInstallmentId(
        [
          { id: 4734, ...duplicate },
          { id: 9999, ...duplicate },
        ],
        target,
      ),
    ).toEqual({ ok: false, reason: 'ambiguous' });
  });
});
