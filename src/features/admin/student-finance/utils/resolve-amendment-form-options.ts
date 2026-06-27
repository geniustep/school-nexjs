import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import { isOneTimeAgreementLine } from './agreement-amendment-line-eligibility';
import { mergeAgreementAmendmentPeriodOptions } from './normalize-agreement-amendment-period-options';

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveAmendmentEffectivePeriodOptions(input: {
  fetchedPeriods?: AgreementAmendmentPeriodOption[] | null;
  previewOpenPeriods?: AgreementAmendmentPeriodOption[];
}): AgreementAmendmentPeriodOption[] {
  return mergeAgreementAmendmentPeriodOptions(input.fetchedPeriods, input.previewOpenPeriods);
}

export interface AgreementAmendmentLineOption {
  id: number;
  label: string;
  feeTypeId: number | null;
  amount: number | null;
  isOneTime?: boolean;
}

export function resolveAmendmentAgreementLineOptions(
  agreement?: FinancialAgreement | null,
): AgreementAmendmentLineOption[] {
  const lines = agreement?.lines ?? agreement?.source_fees ?? [];
  const options: AgreementAmendmentLineOption[] = [];
  for (const line of lines) {
    const id = readFiniteNumber(line.id);
    if (id == null) continue;
    const raw = line as Record<string, unknown>;
    const feeTypeId =
      readFiniteNumber(raw.fee_type_id) ??
      readFiniteNumber(line.service_id) ??
      readFiniteNumber(line.service?.id);
    const label =
      readString(line.service_name) ??
      readString(line.service?.name) ??
      readString(raw.fee_type_name) ??
      String(id);
    options.push({
      id,
      label,
      feeTypeId,
      amount: readFiniteNumber(line.net_amount) ?? readFiniteNumber(line.gross_amount),
      isOneTime: isOneTimeAgreementLine(raw),
    });
  }
  return options;
}
