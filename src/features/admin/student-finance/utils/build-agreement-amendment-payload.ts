import type {
  AgreementAmendmentFormState,
  AgreementAmendmentOperationType,
  AgreementAmendmentRequestPayload,
} from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';
import {
  lineSupportsAdjustLineAmount,
  lineSupportsPeriodAmendment,
} from './agreement-amendment-line-eligibility';
import { resolvePayloadOperationType } from './agreement-amendment-path';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

function readLinePayload(
  operationType: AgreementAmendmentOperationType,
  form: AgreementAmendmentFormState,
  selectedLine?: AgreementAmendmentLineOption | null,
): AgreementAmendmentRequestPayload['line'] {
  if (operationType === 'add_line') {
    return stripUndefined({
      fee_type_id: Number(form.feeTypeId),
      amount: Number(form.amount),
    });
  }

  const sourceLineId = Number(form.sourceLineId);
  const agreementLineId =
    selectedLine?.agreementLineId != null && Number.isFinite(selectedLine.agreementLineId)
      ? selectedLine.agreementLineId
      : undefined;
  const feeTypeId = form.feeTypeId ? Number(form.feeTypeId) : selectedLine?.feeTypeId ?? undefined;

  if (operationType === 'adjust_line_amount') {
    return stripUndefined({
      source_line_id: sourceLineId,
      agreement_line_id: agreementLineId,
      new_unit_price: Number(form.amount),
    });
  }

  if (operationType === 'cancel_line') {
    return stripUndefined({
      source_line_id: sourceLineId,
      agreement_line_id: agreementLineId,
      fee_type_id: feeTypeId,
      amount: 0,
    });
  }

  return stripUndefined({
    source_line_id: sourceLineId,
    agreement_line_id: agreementLineId,
    fee_type_id: feeTypeId,
    amount: Number(form.amount),
  });
}

export function usesPeriodRangeForForm(form: AgreementAmendmentFormState): boolean {
  if (form.operationType === 'add_line') return true;
  if (form.operationType === 'cancel_line') return true;
  if (form.operationType === 'modify_line') return form.amendmentPath === 'period_range';
  return false;
}

export function buildAgreementAmendmentPreviewPayload(
  agreementId: number,
  form: AgreementAmendmentFormState,
  selectedLine?: AgreementAmendmentLineOption | null,
): AgreementAmendmentRequestPayload {
  const payloadOperationType = resolvePayloadOperationType(form.operationType, form.amendmentPath);
  const payload: AgreementAmendmentRequestPayload = {
    agreement_id: agreementId,
    operation_type: payloadOperationType,
    reason: form.reason.trim(),
    line: readLinePayload(payloadOperationType, form, selectedLine),
  };

  if (payloadOperationType !== 'adjust_line_amount' && usesPeriodRangeForForm(form)) {
    const effectivePeriodId = form.effectivePeriodId.trim();
    if (effectivePeriodId) {
      payload.effective_period_id = Number(effectivePeriodId);
    }
  }

  return stripUndefined(
    payload as unknown as Record<string, unknown>,
  ) as unknown as AgreementAmendmentRequestPayload;
}

export function buildAgreementAmendmentApplyPayload(
  agreementId: number,
  form: AgreementAmendmentFormState,
  selectedLine?: AgreementAmendmentLineOption | null,
): AgreementAmendmentRequestPayload {
  return buildAgreementAmendmentPreviewPayload(agreementId, form, selectedLine);
}

export function canSubmitAgreementAmendmentReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export function canSubmitAgreementAmendmentForm(
  form: AgreementAmendmentFormState,
  selectedLine?: AgreementAmendmentLineOption | null,
): boolean {
  if (!canSubmitAgreementAmendmentReason(form.reason)) return false;

  if (form.operationType === 'add_line') {
    if (!usesPeriodRangeForForm(form) || !form.effectivePeriodId.trim()) return false;
    return Boolean(form.feeTypeId) && form.amount.trim() !== '' && Number.isFinite(Number(form.amount));
  }

  if (!form.sourceLineId || !selectedLine) return false;

  if (form.operationType === 'cancel_line') {
    if (!lineSupportsPeriodAmendment(selectedLine)) return false;
    return Boolean(form.effectivePeriodId.trim());
  }

  if (form.operationType === 'modify_line') {
    if (form.amendmentPath === 'adjust_amount') {
      if (!lineSupportsAdjustLineAmount(selectedLine)) return false;
      return form.amount.trim() !== '' && Number.isFinite(Number(form.amount)) && Number(form.amount) >= 0;
    }
    if (form.amendmentPath === 'period_range') {
      if (!lineSupportsPeriodAmendment(selectedLine)) return false;
      if (!form.effectivePeriodId.trim()) return false;
      return form.amount.trim() !== '' && Number.isFinite(Number(form.amount));
    }
    return false;
  }

  return false;
}
