import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';

export type UnifiedModifyIntent = 'none' | 'price' | 'periods' | 'combined';

function normalizePeriodIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function samePeriodSelection(left: string[], right: string[]): boolean {
  const a = normalizePeriodIds(left);
  const b = normalizePeriodIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function resolveUnifiedModifyIntent(input: {
  currentPeriodIds: string[];
  selectedPeriodIds: string[];
  currentAmount: number | null | undefined;
  nextAmountRaw: string;
}): UnifiedModifyIntent {
  const periodsChanged = !samePeriodSelection(input.currentPeriodIds, input.selectedPeriodIds);
  const nextAmount = Number(input.nextAmountRaw);
  const priceChanged =
    input.currentAmount != null &&
    Number.isFinite(input.currentAmount) &&
    Number.isFinite(nextAmount) &&
    Math.abs(nextAmount - input.currentAmount) > 1e-9;

  if (periodsChanged && priceChanged) return 'combined';
  if (periodsChanged) return 'periods';
  if (priceChanged) return 'price';
  return 'none';
}

export function resolveAutomaticRemovalEffectivePeriodId(
  periods: AgreementAmendmentPeriodOption[],
  todayIso = new Date().toISOString().slice(0, 10),
): string {
  const currentOrFuture = periods.find((period) => {
    if (period.periodEnd) return period.periodEnd >= todayIso;
    if (period.periodStart) return period.periodStart >= todayIso;
    return false;
  });
  return currentOrFuture ? String(currentOrFuture.id) : '';
}
