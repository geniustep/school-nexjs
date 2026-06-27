import type {
  AgreementAmendmentPricingContract,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeAgreementAmendmentPricingContract(
  raw: unknown,
): AgreementAmendmentPricingContract | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const contract: AgreementAmendmentPricingContract = {
    amountSemantics: readString(rec.amount_semantics),
    currentUnitPrice: readFiniteNumber(rec.current_unit_price),
    newUnitPrice: readFiniteNumber(rec.new_unit_price),
    affectedPeriodCount: readFiniteNumber(rec.affected_period_count),
    currentTotalForAffectedPeriods: readFiniteNumber(rec.current_total_for_affected_periods),
    newTotalForAffectedPeriods: readFiniteNumber(rec.new_total_for_affected_periods),
    deltaTotal: readFiniteNumber(rec.delta_total),
  };

  const hasValue = Object.values(contract).some((value) => value != null);
  return hasValue ? contract : null;
}

export function hasAgreementAmendmentPricingContract(
  contract: AgreementAmendmentPricingContract | null | undefined,
): boolean {
  if (!contract) return false;
  return Object.values(contract).some((value) => value != null);
}

export function shouldShowAgreementAmendmentLegacyAmounts(
  preview: NormalizedAgreementAmendmentPreview,
): boolean {
  if (
    preview.blockingReasons.some(
      (reason) =>
        reason.code === 'one_time_line_not_period_amendable' ||
        reason.code.includes('one_time_line_not_period_amendable'),
    )
  ) {
    return false;
  }

  if (hasAgreementAmendmentPricingContract(preview.pricingContract)) {
    return false;
  }

  const { amountBefore, amountAfter, delta, allowed } = preview;
  const allZeroOrNull =
    (amountBefore == null || amountBefore === 0) &&
    (amountAfter == null || amountAfter === 0) &&
    (delta == null || delta === 0);

  if (!allowed && allZeroOrNull) return false;
  return amountBefore != null || amountAfter != null || delta != null;
}

export function isBlockedByOneTimeLineNotPeriodAmendable(
  preview: NormalizedAgreementAmendmentPreview,
): boolean {
  return preview.blockingReasons.some(
    (reason) =>
      reason.code === 'one_time_line_not_period_amendable' ||
      reason.code.includes('one_time_line_not_period_amendable'),
  );
}

export function shouldShowAgreementAmendmentAllowedStatus(
  preview: NormalizedAgreementAmendmentPreview,
): boolean {
  return preview.allowed;
}
