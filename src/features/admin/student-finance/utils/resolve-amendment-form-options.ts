import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import { resolveAgreementLineServiceName, resolveAgreementLineTargetId } from './agreement-amendment-line-display';
import {
  isMonthlyAgreementLine,
  isOneTimeAgreementLine,
  resolvePeriodAmendableFromLine,
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
  duplicateServiceWarning: boolean;
  isOneTime?: boolean;
  isMonthly?: boolean;
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
      duplicateServiceWarning: readBoolean(raw.duplicate_service_warning),
      isOneTime,
      isMonthly,
    });
  }
  return options;
}
