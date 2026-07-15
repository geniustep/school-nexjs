import type { FinancialAgreement } from '../types';
import type {
  AgreementAmendmentOperationType,
  AgreementAmendmentPeriodOption,
} from '../types/agreement-amendment';
import { resolveAgreementLineServiceName, resolveAgreementLineTargetId } from './agreement-amendment-line-display';
import {
  isMonthlyAgreementLine,
  isOneTimeAgreementLine,
  resolveAmountAmendableFromLine,
  resolvePeriodAmendableFromLine,
  resolveSupportedAmendmentOperationsFromLine,
} from './agreement-amendment-line-eligibility';
import { mergeAgreementAmendmentPeriodOptions } from './normalize-agreement-amendment-period-options';
import { sortAgreementAmendmentPeriodOptions } from './sort-agreement-amendment-period-options';

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readNullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

function readNonNegativeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export function resolveAmendmentEffectivePeriodOptions(input: {
  fetchedPeriods?: AgreementAmendmentPeriodOption[] | null;
  previewOpenPeriods?: AgreementAmendmentPeriodOption[];
}): AgreementAmendmentPeriodOption[] {
  return sortAgreementAmendmentPeriodOptions(
    mergeAgreementAmendmentPeriodOptions(input.fetchedPeriods, input.previewOpenPeriods),
  );
}

export interface AgreementAmendmentLineOption {
  id: number;
  sourceLineId: number;
  agreementLineId: number | null;
  label: string;
  feeTypeId: number | null;
  amount: number | null;
  unitPrice: number | null;
  quantity: number | null;
  commitmentType: string | null;
  pricingUnit: string | null;
  periodAmendable: boolean;
  amendmentBlockReason: string | null;
  amountAmendable: boolean;
  amountAmendmentBlockReason: string | null;
  supportedAmendmentOperations: AgreementAmendmentOperationType[];
  duplicateServiceWarning: boolean;
  isOneTime?: boolean;
  isMonthly?: boolean;
  operationalState: string | null;
  isInCurrentSchedule: boolean | null;
  openInstallmentCount: number | null;
  cancelledInstallmentCount: number | null;
  historicalInstallmentCount: number | null;
  canModify: boolean | null;
  canCancelLine: boolean | null;
  statusReasonCode: string | null;
}

export function resolveAmendmentAgreementLineOptions(
  agreement?: FinancialAgreement | null,
): AgreementAmendmentLineOption[] {
  const lines = agreement?.lines ?? agreement?.source_fees ?? [];
  const options: AgreementAmendmentLineOption[] = [];
  const seenTargetIds = new Set<number>();

  for (const line of lines) {
    const raw = line as Record<string, unknown>;
    const targetId = resolveAgreementLineTargetId(line);
    if (targetId == null) continue;
    if (seenTargetIds.has(targetId)) continue;
    seenTargetIds.add(targetId);

    const feeTypeId =
      readFiniteNumber(raw.fee_type_id) ??
      readFiniteNumber(line.service_id) ??
      readFiniteNumber(line.service?.id);

    const label = resolveAgreementLineServiceName(line);
    const periodAmendable = resolvePeriodAmendableFromLine(raw);
    const amountAmendable = resolveAmountAmendableFromLine(raw);
    const supportedAmendmentOperations = resolveSupportedAmendmentOperationsFromLine(raw);
    const isOneTime = isOneTimeAgreementLine(raw);
    const isMonthly = isMonthlyAgreementLine(raw);

    options.push({
      id: targetId,
      sourceLineId: readFiniteNumber(raw.source_line_id) ?? targetId,
      agreementLineId:
        readFiniteNumber(raw.agreement_line_id) ?? readFiniteNumber(line.id) ?? targetId,
      label,
      feeTypeId,
      amount: readFiniteNumber(line.net_amount) ?? readFiniteNumber(line.gross_amount),
      unitPrice: readFiniteNumber(line.unit_price),
      quantity: readFiniteNumber(line.quantity),
      commitmentType: readString(line.commitment_type),
      pricingUnit: readString(line.pricing_unit),
      periodAmendable,
      amendmentBlockReason: readString(raw.amendment_block_reason),
      amountAmendable,
      amountAmendmentBlockReason: readString(raw.amount_amendment_block_reason),
      supportedAmendmentOperations,
      duplicateServiceWarning: readBoolean(raw.duplicate_service_warning),
      isOneTime,
      isMonthly,
      operationalState: readString(raw.operational_state),
      isInCurrentSchedule: readNullableBoolean(raw.is_in_current_schedule),
      openInstallmentCount: readNonNegativeInt(raw.open_installment_count),
      cancelledInstallmentCount: readNonNegativeInt(raw.cancelled_installment_count),
      historicalInstallmentCount: readNonNegativeInt(raw.historical_installment_count),
      canModify: readNullableBoolean(raw.can_modify),
      canCancelLine: readNullableBoolean(raw.can_cancel_line),
      statusReasonCode: readString(raw.status_reason_code),
    });
  }
  return options;
}
