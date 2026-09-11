import { describe, expect, it } from 'vitest';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';
import {
  buildAgreementAmendmentApplyPayload,
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
} from './build-agreement-amendment-payload';
import { normalizeAgreementAmendmentPreview } from './normalize-agreement-amendment-preview';

const line: AgreementAmendmentLineOption = {
  id: 17,
  sourceLineId: 17,
  agreementLineId: 17,
  label: 'النقل',
  feeTypeId: 8,
  amount: 500,
  unitPrice: 500,
  quantity: 10,
  commitmentType: 'renewable_subscription',
  pricingUnit: 'month',
  periodAmendable: true,
  amendmentBlockReason: null,
  amountAmendable: true,
  amountAmendmentBlockReason: null,
  supportedAmendmentOperations: ['modify_line', 'cancel_line'],
  duplicateServiceWarning: false,
  isOneTime: false,
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

function sparseForm(overrides: Partial<AgreementAmendmentFormState> = {}): AgreementAmendmentFormState {
  return {
    operationType: 'modify_line',
    amendmentPath: 'period_range',
    effectivePeriodId: '',
    effectivePeriodEndId: '',
    selectedPeriodIds: ['101', '103', '104', '105'],
    periodAmountOverrides: { '105': '1500' },
    reason: 'تعديل السعر لأشهر مختارة',
    sourceLineId: '17',
    feeTypeId: '8',
    amount: '1800',
    ...overrides,
  };
}

describe('sparse agreement amendment UX contract', () => {
  it('1) sends only selected months through effective_period_ids', () => {
    const payload = buildAgreementAmendmentPreviewPayload(42, sparseForm(), line);
    expect(payload.operation_type).toBe('modify_line');
    expect(payload.effective_period_ids).toEqual([101, 103, 104, 105]);
    expect(payload.effective_period_id).toBeUndefined();
    expect(payload.effective_period_ids).not.toContain(102);
  });

  it('2) sends the new default price through line.amount', () => {
    const payload = buildAgreementAmendmentPreviewPayload(42, sparseForm(), line);
    expect(payload.line.amount).toBe(1800);
    expect(payload.line.new_unit_price).toBeUndefined();
  });

  it('3) sends a special month price only for a selected month', () => {
    const payload = buildAgreementAmendmentPreviewPayload(42, sparseForm(), line);
    expect(payload.line.period_amount_overrides).toEqual([
      { effective_period_id: 105, amount: 1500 },
    ]);
    expect(canSubmitAgreementAmendmentForm(sparseForm(), line)).toBe(true);
    expect(
      canSubmitAgreementAmendmentForm(
        sparseForm({ selectedPeriodIds: ['101'], periodAmountOverrides: { '105': '1500' } }),
        line,
      ),
    ).toBe(false);
  });

  it('4) keeps a one-month sparse request on modify_line instead of legacy single-installment mode', () => {
    const payload = buildAgreementAmendmentPreviewPayload(
      42,
      sparseForm({ selectedPeriodIds: ['105'], periodAmountOverrides: { '105': '1500' } }),
      line,
    );
    expect(payload.operation_type).toBe('modify_line');
    expect(payload.effective_period_ids).toEqual([105]);
  });

  it('5) blocks submission when no month is selected', () => {
    expect(
      canSubmitAgreementAmendmentForm(
        sparseForm({ selectedPeriodIds: [], periodAmountOverrides: {}, effectivePeriodId: '' }),
        line,
      ),
    ).toBe(false);
  });

  it('6) normalizes Odoo period_impacts without recalculating them in Next.js', () => {
    const preview = normalizeAgreementAmendmentPreview({
      allowed: true,
      can_apply: true,
      selection_mode: 'sparse',
      selected_period_ids: [101, 105],
      period_impacts: [
        {
          effective_period_id: 101,
          period_key: '2026-09',
          period_label: 'شتنبر 2026',
          current_amount: 500,
          proposed_amount: 1800,
          delta: 1300,
          override_applied: false,
          amendable: true,
        },
        {
          effective_period_id: 105,
          period_key: '2027-01',
          period_label: 'يناير 2027',
          current_amount: 500,
          proposed_amount: 1500,
          delta: 1000,
          override_applied: true,
          amendable: true,
        },
      ],
    });

    expect(preview.selectionMode).toBe('sparse');
    expect(preview.selectedPeriodIds).toEqual([101, 105]);
    expect((preview.periodImpacts ?? [])[1]).toMatchObject({
      effectivePeriodId: 105,
      currentAmount: 500,
      proposedAmount: 1500,
      delta: 1000,
      overrideApplied: true,
    });
  });

  it('7) keeps preview and apply payloads identical for the same sparse decision', () => {
    const form = sparseForm();
    expect(buildAgreementAmendmentApplyPayload(42, form, line)).toEqual(
      buildAgreementAmendmentPreviewPayload(42, form, line),
    );
  });
});
