import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isOneTimeAgreementLine(line: Record<string, unknown>): boolean {
  if (line.is_one_time === true) return true;
  const commitmentType = readString(line.commitment_type)?.toLowerCase();
  if (commitmentType === 'one_time' || commitmentType === 'once') return true;
  const pricingUnit = readString(line.pricing_unit)?.toLowerCase();
  if (pricingUnit === 'one_time' || pricingUnit === 'once') return true;
  if (pricingUnit === 'academic_year' && commitmentType === 'one_time') return true;
  const frequency = readString(line.frequency)?.toLowerCase();
  if (frequency === 'one_time' || frequency === 'once') return true;
  const chargeGenerationMode = readString(line.charge_generation_mode)?.toLowerCase();
  if (chargeGenerationMode === 'one_time' || chargeGenerationMode === 'once') return true;
  return false;
}

export function isPeriodAmendableLineOption(line: AgreementAmendmentLineOption): boolean {
  return line.isOneTime !== true;
}

export function filterPeriodAmendableLineOptions(
  lines: AgreementAmendmentLineOption[],
): AgreementAmendmentLineOption[] {
  return lines.filter(isPeriodAmendableLineOption);
}

export function agreementHasOneTimeLineMetadata(agreement?: FinancialAgreement | null): boolean {
  const lines = agreement?.lines ?? agreement?.source_fees ?? [];
  return lines.some((line) => isOneTimeAgreementLine(line as Record<string, unknown>));
}
