import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentLineOption } from './resolve-amendment-form-options';

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

/** Prefer Odoo period_amendable contract; fall back to legacy heuristics. */
export function resolvePeriodAmendableFromLine(
  line: Record<string, unknown>,
): boolean {
  const explicit = readBoolean(line.period_amendable);
  if (explicit != null) return explicit;
  return !isOneTimeAgreementLine(line);
}

export function isPeriodAmendableLineOption(line: AgreementAmendmentLineOption): boolean {
  if (typeof line.periodAmendable === 'boolean') return line.periodAmendable;
  return line.isOneTime !== true;
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
  return isPeriodAmendableLineOption(line);
}
