import { describe, expect, it } from 'vitest';
import {
  lineSupportsCancelLine,
  lineSupportsModifyLine,
  resolveAgreementLineOperationBlockReasonCode,
  resolveSupportedAmendmentOperationsFromLine,
} from './agreement-amendment-line-eligibility';
import { agreementAmendmentErrorMessageKey, resolveAgreementAmendmentErrorMessage } from './agreement-amendment-errors';
import { isLineSelectableForAmendmentOperation } from './agreement-amendment-path';
import {
  canSubmitAgreementAmendmentForm,
} from './build-agreement-amendment-payload';
import { normalizeFinancialAgreementLine } from './normalize-financial-agreement-line';
import {
  resolveAgreementLineOperationalState,
  hasAgreementLineLifecycleActionContract,
} from './resolve-agreement-line-operational-state';
import { resolveAmendmentAgreementLineOptions } from './resolve-amendment-form-options';
import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';

function lineFixture(partial: Record<string, unknown>): AgreementAmendmentLineOption {
  return resolveAmendmentAgreementLineOptions({
    id: 77,
    student_id: 88,
    state: 'active',
    lines: [
      {
        id: 501,
        source_line_id: 501,
        agreement_line_id: 501,
        service_name: 'خدمة اختبار',
        commitment_type: 'renewable_subscription',
        pricing_unit: 'month',
        quantity: 10,
        unit_price: 1600,
        ...partial,
      },
    ],
  } as unknown as FinancialAgreement)[0]!;
}

const baseModifyForm = (lineId: number): AgreementAmendmentFormState => ({
  operationType: 'modify_line',
  amendmentPath: 'period_range',
  effectivePeriodId: '11',
  effectivePeriodEndId: '',
  reason: 'QA lifecycle',
  sourceLineId: String(lineId),
  feeTypeId: '',
  amount: '1500',
});

describe('agreement line operational lifecycle contract', () => {
  it('normalizes lifecycle fields without inferring from net_amount', () => {
    const line = normalizeFinancialAgreementLine({
      id: 10,
      service_id: 1,
      net_amount: 0,
      adjustment_amount: -16000,
      operational_state: 'active_current',
      is_in_current_schedule: true,
      open_installment_count: 10,
      cancelled_installment_count: 0,
      historical_installment_count: 0,
      can_modify: true,
      can_cancel_line: true,
      status_reason_code: null,
    });
    expect(line?.operational_state).toBe('active_current');
    expect(line?.can_modify).toBe(true);
    expect(line?.adjustment_amount).toBe(-16000);
    expect(line?.open_installment_count).toBe(10);

    const badCounts = normalizeFinancialAgreementLine({
      id: 11,
      service_id: 1,
      open_installment_count: -3,
      cancelled_installment_count: 'x',
      can_modify: false,
    });
    expect(badCounts?.open_installment_count).toBeUndefined();
    expect(badCounts?.cancelled_installment_count).toBeUndefined();
    expect(badCounts?.can_modify).toBe(false);
  });

  it('Scenario A — active_current selectable for modify and cancel', () => {
    const line = lineFixture({
      operational_state: 'active_current',
      is_in_current_schedule: true,
      open_installment_count: 10,
      can_modify: true,
      can_cancel_line: true,
      period_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
      net_amount: 16000,
    });
    const presentation = resolveAgreementLineOperationalState(line);
    expect(presentation.canonicalState).toBe('active_current');
    expect(presentation.isCurrent).toBe(true);
    expect(presentation.labelKey).toContain('active_current');
    expect(presentation.badgeTone).toBe('green');
    expect(lineSupportsModifyLine(line)).toBe(true);
    expect(lineSupportsCancelLine(line)).toBe(true);
    expect(isLineSelectableForAmendmentOperation(line, 'modify_line')).toBe(true);
    expect(isLineSelectableForAmendmentOperation(line, 'cancel_line')).toBe(true);
    expect(canSubmitAgreementAmendmentForm(baseModifyForm(line.id), line)).toBe(true);
  });

  it('Scenario B — cancelled_historical_only disabled before preview', () => {
    const line = lineFixture({
      operational_state: 'cancelled_historical_only',
      is_in_current_schedule: false,
      open_installment_count: 0,
      cancelled_installment_count: 10,
      historical_installment_count: 10,
      can_modify: false,
      can_cancel_line: false,
      period_amendable: false,
      supported_amendment_operations: [],
      status_reason_code: 'no_open_installments_to_amend',
      amendment_block_reason: 'no_open_installments_to_amend',
      net_amount: 0,
    });
    const presentation = resolveAgreementLineOperationalState(line);
    expect(presentation.canonicalState).toBe('cancelled_historical_only');
    expect(presentation.isHistoricalOnly).toBe(true);
    expect(presentation.badgeTone).toBe('red');
    expect(lineSupportsModifyLine(line)).toBe(false);
    expect(lineSupportsCancelLine(line)).toBe(false);
    expect(isLineSelectableForAmendmentOperation(line, 'modify_line')).toBe(false);
    expect(isLineSelectableForAmendmentOperation(line, 'cancel_line')).toBe(false);
    expect(resolveAgreementLineOperationBlockReasonCode(line, 'modify_line')).toBe(
      'no_open_installments_to_amend',
    );
    expect(canSubmitAgreementAmendmentForm(baseModifyForm(line.id), line)).toBe(false);
  });

  it('Scenario C — completed_historical_only is presentation-only by default', () => {
    const line = lineFixture({
      operational_state: 'completed_historical_only',
      is_in_current_schedule: false,
      open_installment_count: 0,
      can_modify: false,
      can_cancel_line: false,
      period_amendable: false,
      supported_amendment_operations: [],
    });
    const presentation = resolveAgreementLineOperationalState(line);
    expect(presentation.canonicalState).toBe('completed_historical_only');
    expect(presentation.badgeTone).toBe('blue');
    expect(lineSupportsModifyLine(line)).toBe(false);
    expect(lineSupportsCancelLine(line)).toBe(false);
  });

  it('Scenario D — historical_only does not invent cancel reason', () => {
    const line = lineFixture({
      operational_state: 'historical_only',
      is_in_current_schedule: false,
      can_modify: false,
      can_cancel_line: false,
      period_amendable: false,
      supported_amendment_operations: [],
    });
    const presentation = resolveAgreementLineOperationalState(line);
    expect(presentation.canonicalState).toBe('historical_only');
    expect(presentation.descriptionKey).toContain('notIncludedInCurrentSchedule');
    expect(lineSupportsModifyLine(line)).toBe(false);
  });

  it('Scenario E — unscheduled follows Backend flags only', () => {
    const blocked = lineFixture({
      operational_state: 'unscheduled',
      is_in_current_schedule: false,
      can_modify: false,
      can_cancel_line: false,
      period_amendable: false,
      supported_amendment_operations: [],
    });
    expect(resolveAgreementLineOperationalState(blocked).canonicalState).toBe('unscheduled');
    expect(lineSupportsModifyLine(blocked)).toBe(false);

    const allowed = lineFixture({
      operational_state: 'unscheduled',
      can_modify: true,
      can_cancel_line: false,
      period_amendable: true,
      supported_amendment_operations: ['modify_line'],
    });
    expect(lineSupportsModifyLine(allowed)).toBe(true);
    expect(lineSupportsCancelLine(allowed)).toBe(false);
  });

  it('Scenario F — zero-net active stays selectable', () => {
    const line = lineFixture({
      net_amount: 0,
      operational_state: 'active_current',
      is_in_current_schedule: true,
      open_installment_count: 5,
      can_modify: true,
      can_cancel_line: true,
      period_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
    });
    const presentation = resolveAgreementLineOperationalState(line);
    expect(presentation.canonicalState).toBe('active_current');
    expect(presentation.isHistoricalOnly).toBe(false);
    expect(lineSupportsModifyLine(line)).toBe(true);
  });

  it('Scenario G — missing lifecycle contract disables modify/cancel safely', () => {
    const line = lineFixture({
      period_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
      net_amount: 0,
    });
    expect(hasAgreementLineLifecycleActionContract(line)).toBe(false);
    expect(resolveAgreementLineOperationalState(line).lifecycleContractPresent).toBe(false);
    expect(resolveAgreementLineOperationalState(line).labelKey).toContain('unavailable');
    expect(lineSupportsModifyLine(line)).toBe(false);
    expect(lineSupportsCancelLine(line)).toBe(false);
    expect(resolveAgreementLineOperationBlockReasonCode(line, 'modify_line')).toBe(
      'agreement_line_lifecycle_unavailable',
    );
    expect(canSubmitAgreementAmendmentForm(baseModifyForm(line.id), line)).toBe(false);
  });

  it('Scenario H — can_modify=false wins over supported operations conflict', () => {
    const line = lineFixture({
      operational_state: 'active_current',
      can_modify: false,
      can_cancel_line: false,
      period_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
    });
    expect(resolveSupportedAmendmentOperationsFromLine({
      can_modify: false,
      can_cancel_line: false,
      period_amendable: true,
      supported_amendment_operations: ['modify_line', 'cancel_line'],
    })).toEqual(['modify_line', 'cancel_line']);
    expect(lineSupportsModifyLine(line)).toBe(false);
    expect(isLineSelectableForAmendmentOperation(line, 'modify_line')).toBe(false);
    expect(canSubmitAgreementAmendmentForm(baseModifyForm(line.id), line)).toBe(false);
  });

  it('translates no_open_installments_to_amend distinctly from adjust variant', () => {
    expect(agreementAmendmentErrorMessageKey('no_open_installments_to_amend')).toBe(
      'admin.student360.financeWorkspace.agreementAmendment.reasonCodes.no_open_installments_to_amend',
    );
    expect(agreementAmendmentErrorMessageKey('no_open_installments_to_adjust')).toBe(
      'admin.student360.financeWorkspace.agreementAmendment.reasonCodes.no_open_installments_to_adjust',
    );

    const t = (key: string) => {
      if (key.endsWith('no_open_installments_to_amend')) {
        return 'لا توجد أقساط مفتوحة قابلة للتعديل ابتداءً من الفترة المختارة.';
      }
      if (key.endsWith('no_open_installments_to_adjust')) {
        return 'لا توجد أقساط مفتوحة يمكن تعديلها لهذا البند.';
      }
      return key;
    };
    expect(resolveAgreementAmendmentErrorMessage('no_open_installments_to_amend', 'raw', t)).toContain(
      'قابلة للتعديل',
    );
    expect(resolveAgreementAmendmentErrorMessage('no_open_installments_to_adjust', 'raw', t)).toContain(
      'يمكن تعديلها',
    );
  });
});
