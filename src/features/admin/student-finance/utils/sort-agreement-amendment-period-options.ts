import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';

function readSortableDate(value: string | null | undefined): number {
  if (!value?.trim()) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function sortAgreementAmendmentPeriodOptions(
  options: AgreementAmendmentPeriodOption[],
): AgreementAmendmentPeriodOption[] {
  return [...options].sort((a, b) => {
    const sequenceA = a.sequence ?? Number.MAX_SAFE_INTEGER;
    const sequenceB = b.sequence ?? Number.MAX_SAFE_INTEGER;
    if (sequenceA !== sequenceB) return sequenceA - sequenceB;

    const startA = readSortableDate(a.periodStart);
    const startB = readSortableDate(b.periodStart);
    if (startA !== startB) return startA - startB;

    const keyA = a.periodKey ?? a.label;
    const keyB = b.periodKey ?? b.label;
    if (keyA !== keyB) {
      // ISO-like period keys (2026-09) sort chronologically via localeCompare.
      return keyA.localeCompare(keyB);
    }

    return a.id - b.id;
  });
}
