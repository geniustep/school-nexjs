import type { AgreementAmendmentOperationType } from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';
import {
  AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON,
  hasAgreementLineLifecycleActionContract,
  resolveAgreementLineAmendmentBlockReasonCode,
} from './resolve-agreement-line-operational-state';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeToken(value: unknown): string | null {
  const raw = readString(value);
  if (!raw) return null;
  return raw.toLowerCase().replace(/\s+/g, '_');
}

const VALID_AMENDMENT_OPERATIONS = new Set<AgreementAmendmentOperationType>([
  'add_line',
  'cancel_line',
  'modify_line',
  'adjust_line_amount',
]);

export function isMonthlyAgreementLine(line: Record<string, unknown>): boolean {
  const commitmentType = normalizeToken(line.commitment_type);
  const pricingUnit = normalizeToken(line.pricing_unit);
  const frequency = normalizeToken(line.frequency);

  if (pricingUnit === 'month') return true;
  if (frequency === 'monthly' || frequency === 'month') return true;
  if (
    commitmentType === 'renewable_subscription' ||
    commitmentType === 'recurring' ||
    commitmentType === 'monthly'
  ) {
    return true;
  }
  return false;
}

export function isOneTimeAgreementLine(line: Record<string, unknown>): boolean {
  if (isMonthlyAgreementLine(line)) return false;
  if (line.is_one_time === true) return true;

  const commitmentType = normalizeToken(line.commitment_type);
  if (commitmentType === 'one_time' || commitmentType === 'once') return true;

  const pricingUnit = normalizeToken(line.pricing_unit);
  if (pricingUnit === 'one_time' || pricingUnit === 'once') return true;
  if (pricingUnit === 'academic_year') return true;

  const frequency = normalizeToken(line.frequency);
  if (frequency === 'one_time' || frequency === 'once') return true;

  const chargeGenerationMode = normalizeToken(line.charge_generation_mode);
  if (chargeGenerationMode === 'one_time' || chargeGenerationMode === 'once') return true;

  return false;
}

/** Prefer Odoo period_amendable contract; fall back to legacy heuristics for display only. */
export function resolvePeriodAmendableFromLine(line: Record<string, unknown>): boolean {
  const explicit = readBoolean(line.period_amendable);
  if (explicit != null) return explicit;
  return !isOneTimeAgreementLine(line);
}

/** Prefer Odoo amount_amendable; legacy agreements default to false. */
export function resolveAmountAmendableFromLine(line: Record<string, unknown>): boolean {
  const explicit = readBoolean(line.amount_amendable);
  if (explicit != null) return explicit;
  return false;
}

/**
 * Prefer explicit Backend operations list.
 * Never infer modify_line/cancel_line from period_amendable alone when lifecycle
 * action flags are missing — release order requires Backend lifecycle first.
 */
export function resolveSupportedAmendmentOperationsFromLine(
  line: Record<string, unknown>,
): AgreementAmendmentOperationType[] {
  const raw = line.supported_amendment_operations;
  const hasLifecycle = hasAgreementLineLifecycleActionContract(line);
  if (Array.isArray(raw)) {
    const ops = raw
      .map((entry) => normalizeToken(entry))
      .filter((entry): entry is AgreementAmendmentOperationType =>
        entry != null && VALID_AMENDMENT_OPERATIONS.has(entry as AgreementAmendmentOperationType),
      );
    if (ops.length > 0 || hasLifecycle) return ops;
  }

  const inferred: AgreementAmendmentOperationType[] = [];
  if (readBoolean(line.can_modify) === true) {
    inferred.push('modify_line');
  }
  if (readBoolean(line.can_cancel_line) === true) {
    inferred.push('cancel_line');
  }
  if (resolveAmountAmendableFromLine(line)) {
    inferred.push('adjust_line_amount');
  }
  return inferred;
}

export function isPeriodAmendableLineOption(line: AgreementAmendmentLineOption): boolean {
  if (typeof line.periodAmendable === 'boolean') return line.periodAmendable;
  return line.isOneTime !== true;
}

export function lineSupportsAdjustLineAmount(line: AgreementAmendmentLineOption): boolean {
  if (line.amountAmendable !== true) return false;
  if (line.supportedAmendmentOperations.length === 0) return true;
  return line.supportedAmendmentOperations.includes('adjust_line_amount');
}

/** Period modify_line path — Backend can_modify is required and wins conflicts. */
export function lineSupportsModifyLine(line: AgreementAmendmentLineOption): boolean {
  if (!hasAgreementLineLifecycleActionContract(line)) return false;
  if (line.canModify !== true) return false;
  if (!isPeriodAmendableLineOption(line)) return false;
  if (!line.supportedAmendmentOperations.includes('modify_line')) return false;
  // Defensive: blocking reason never allows modify even if a conflicting ops list exists.
  const reason =
    resolveAgreementLineAmendmentBlockReasonCode(line) ??
    line.statusReasonCode ??
    line.amendmentBlockReason;
  if (reason === 'no_open_installments_to_amend') return false;
  return true;
}

/** cancel_line path — Backend can_cancel_line is required and wins conflicts. */
export function lineSupportsCancelLine(line: AgreementAmendmentLineOption): boolean {
  if (!hasAgreementLineLifecycleActionContract(line)) return false;
  if (line.canCancelLine !== true) return false;
  if (!line.supportedAmendmentOperations.includes('cancel_line')) return false;
  const reason =
    resolveAgreementLineAmendmentBlockReasonCode(line) ?? line.statusReasonCode ?? line.amendmentBlockReason;
  if (reason === 'no_open_installments_to_amend') return false;
  return true;
}

/**
 * @deprecated Prefer lineSupportsModifyLine / lineSupportsCancelLine for operation-specific checks.
 * Kept as OR for shared “any period path” callers.
 */
export function lineSupportsPeriodAmendment(line: AgreementAmendmentLineOption): boolean {
  return lineSupportsModifyLine(line) || lineSupportsCancelLine(line);
}

/** @deprecated Use all lines in picker with disabled state instead of filtering. */
export function filterPeriodAmendableLineOptions(
  lines: AgreementAmendmentLineOption[],
): AgreementAmendmentLineOption[] {
  return lines.filter(isPeriodAmendableLineOption);
}

export function agreementHasOneTimeLineMetadata(agreement?: FinancialAgreement | null): boolean {
  const lines = agreement?.lines ?? agreement?.source_fees ?? [];
  return lines.some((line) => isOneTimeAgreementLine(line as Record<string, unknown>));
}

export function isLineSelectableForPeriodAmendment(line: AgreementAmendmentLineOption): boolean {
  return lineSupportsPeriodAmendment(line);
}

export function isLineSelectableForModifyLine(line: AgreementAmendmentLineOption): boolean {
  return lineSupportsModifyLine(line);
}

export function isLineSelectableForCancelLine(line: AgreementAmendmentLineOption): boolean {
  return lineSupportsCancelLine(line);
}

export function isLineSelectableForAmountAmendment(line: AgreementAmendmentLineOption): boolean {
  return lineSupportsAdjustLineAmount(line);
}

export function isLineFullyBlockedForAmendment(line: AgreementAmendmentLineOption): boolean {
  return (
    !lineSupportsAdjustLineAmount(line) &&
    !lineSupportsModifyLine(line) &&
    !lineSupportsCancelLine(line)
  );
}

export function resolveAgreementLineOperationBlockReasonCode(
  line: AgreementAmendmentLineOption,
  operationType: AgreementAmendmentOperationType,
): string | null {
  if (operationType === 'add_line') return null;

  if (!hasAgreementLineLifecycleActionContract(line)) {
    if (operationType === 'modify_line' || operationType === 'cancel_line') {
      return AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON;
    }
  }

  const backendReason =
    resolveAgreementLineAmendmentBlockReasonCode(line) ??
    line.statusReasonCode ??
    line.amendmentBlockReason;

  if (operationType === 'modify_line') {
    if (lineSupportsModifyLine(line) || lineSupportsAdjustLineAmount(line)) return null;
    return backendReason ?? AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON;
  }

  if (operationType === 'cancel_line') {
    if (lineSupportsCancelLine(line)) return null;
    return backendReason ?? AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON;
  }

  if (operationType === 'adjust_line_amount') {
    if (lineSupportsAdjustLineAmount(line)) return null;
    return line.amountAmendmentBlockReason ?? backendReason;
  }

  return backendReason;
}
