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

function reconcileForm(ids = ['101', '102', '104']): AgreementAmendmentFormState {
  return {
    operationType: 'reconcile_periods',
    amendmentPath: 'period_range',
    effectivePeriodId: '',
    effectivePeriodEndId: '',
    selectedPeriodIds: ids,
    periodAmountOverrides: {},
    reason: 'تحديث الأشهر المشمولة',
    sourceLineId: '17',
    feeTypeId: '8',
    amount: '',
  };
}

describe('reconcile_periods UI contract', () => {
  it('sends the full final month set through target_period_ids only', () => {
    const payload = buildAgreementAmendmentPreviewPayload(42, reconcileForm(), line);
    expect(payload.operation_type).toBe('reconcile_periods');
    expect(payload.target_period_ids).toEqual([101, 102, 104]);
    expect(payload.effective_period_ids).toBeUndefined();
    expect(payload.effective_period_id).toBeUndefined();
    expect(payload.line.amount).toBeUndefined();
  });

  it('keeps preview and apply payloads identical', () => {
    expect(buildAgreementAmendmentApplyPayload(42, reconcileForm(), line)).toEqual(
      buildAgreementAmendmentPreviewPayload(42, reconcileForm(), line),
    );
  });

  it('requires at least one included month', () => {
    expect(canSubmitAgreementAmendmentForm(reconcileForm(), line)).toBe(true);
    expect(canSubmitAgreementAmendmentForm(reconcileForm([]), line)).toBe(false);
  });

  it('does not change sparse modify_line semantics', () => {
    const form: AgreementAmendmentFormState = {
      ...reconcileForm(['101', '104']),
      operationType: 'modify_line',
      amount: '500',
      reason: 'تعديل السعر فقط',
    };
    const payload = buildAgreementAmendmentPreviewPayload(42, form, line);
    expect(payload.operation_type).toBe('modify_line');
    expect(payload.effective_period_ids).toEqual([101, 104]);
    expect(payload.target_period_ids).toBeUndefined();
  });

  it('normalizes reconciliation truth without recalculating finance in Next.js', () => {
    const preview = normalizeAgreementAmendmentPreview({
      allowed: true,
      can_apply: true,
      current_periods: [{ id: 101 }, { id: 102 }],
      target_periods: [{ id: 101 }, { id: 103 }],
      preserved_periods: [{ id: 101 }],
      current_quantity: 2,
      resulting_quantity: 2,
      already_aligned: false,
      amount_before: 1000,
      amount_after: 1000,
      delta: 0,
    });
    expect(preview.currentPeriodIds).toEqual([101, 102]);
    expect(preview.targetPeriodIds).toEqual([101, 103]);
    expect(preview.preservedPeriodIds).toEqual([101]);
    expect(preview.currentQuantity).toBe(2);
    expect(preview.resultingQuantity).toBe(2);
    expect(preview.alreadyAligned).toBe(false);
    expect(preview.amountBefore).toBe(1000);
    expect(preview.amountAfter).toBe(1000);
  });
});
