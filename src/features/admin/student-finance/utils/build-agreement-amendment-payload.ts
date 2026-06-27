import type {
  AgreementAmendmentFormState,
  AgreementAmendmentOperationType,
  AgreementAmendmentRequestPayload,
} from '../types/agreement-amendment';

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
): AgreementAmendmentRequestPayload['line'] {
  const feeTypeId = Number(form.feeTypeId);
  if (operationType === 'add_line') {
    return {
      fee_type_id: feeTypeId,
      amount: Number(form.amount),
    };
  }

  const sourceLineId = Number(form.sourceLineId);
  if (operationType === 'cancel_line') {
    return {
      source_line_id: sourceLineId,
      fee_type_id: feeTypeId,
      amount: 0,
    };
  }

  return {
    source_line_id: sourceLineId,
    fee_type_id: feeTypeId,
    amount: Number(form.amount),
  };
}

export function buildAgreementAmendmentPreviewPayload(
  agreementId: number,
  form: AgreementAmendmentFormState,
): AgreementAmendmentRequestPayload {
  const effectivePeriodId = form.effectivePeriodId.trim();
  const payload: AgreementAmendmentRequestPayload = {
    agreement_id: agreementId,
    operation_type: form.operationType,
    reason: form.reason.trim(),
    line: readLinePayload(form.operationType, form),
  };

  if (effectivePeriodId) {
    payload.effective_period_id = Number(effectivePeriodId);
  }

  return stripUndefined(
    payload as unknown as Record<string, unknown>,
  ) as unknown as AgreementAmendmentRequestPayload;
}

export function buildAgreementAmendmentApplyPayload(
  agreementId: number,
  form: AgreementAmendmentFormState,
): AgreementAmendmentRequestPayload {
  return buildAgreementAmendmentPreviewPayload(agreementId, form);
}

export function canSubmitAgreementAmendmentReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export function canSubmitAgreementAmendmentForm(form: AgreementAmendmentFormState): boolean {
  if (!canSubmitAgreementAmendmentReason(form.reason)) return false;
  if (!form.effectivePeriodId.trim()) return false;

  if (form.operationType === 'add_line') {
    return Boolean(form.feeTypeId) && form.amount.trim() !== '' && Number.isFinite(Number(form.amount));
  }

  if (!form.sourceLineId) return false;
  if (!form.feeTypeId) return false;
  if (form.operationType === 'cancel_line') return true;
  return form.amount.trim() !== '' && Number.isFinite(Number(form.amount));
}
