import type { DraftFeePlanLine, FeePlanSummaryTotals } from './fee-plan-types';

export function computeFeePlanSummary(
  lines: DraftFeePlanLine[],
  currency?: string | null,
): FeePlanSummaryTotals {
  let requiredCount = 0;
  let optionalCount = 0;
  let requiredTotal = 0;
  let optionalTotal = 0;

  for (const line of lines) {
    if (!line.amount || line.amount <= 0) continue;
    if (line.isOptional) {
      optionalCount += 1;
      optionalTotal += line.amount;
    } else {
      requiredCount += 1;
      requiredTotal += line.amount;
    }
  }

  return {
    lineCount: lines.length,
    requiredCount,
    optionalCount,
    requiredTotal,
    optionalTotal,
    grandTotal: requiredTotal + optionalTotal,
    currency: currency ?? null,
  };
}
