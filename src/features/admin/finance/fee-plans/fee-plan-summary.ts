import type { DraftFeePlanLine, FeePlanSummaryTotals } from './fee-plan-types';
import { computeDraftPlanFinancialBreakdown } from './fee-plan-pricing';

export function computeFeePlanSummary(
  lines: DraftFeePlanLine[],
  currency?: string | null,
): FeePlanSummaryTotals {
  let requiredCount = 0;
  let optionalCount = 0;
  let requiredTotal = 0;
  let optionalTotal = 0;
  let maxInstallmentCount = 0;

  for (const line of lines) {
    if (!line.amount || line.amount <= 0) continue;
    const installments = line.installmentCount > 0 ? line.installmentCount : 1;
    maxInstallmentCount = Math.max(maxInstallmentCount, installments);

    if (line.isOptional) {
      optionalCount += 1;
      optionalTotal += line.amount;
    } else {
      requiredCount += 1;
      requiredTotal += line.amount;
    }
  }

  const breakdown = computeDraftPlanFinancialBreakdown(lines);

  return {
    lineCount: lines.length,
    requiredCount,
    optionalCount,
    requiredTotal,
    optionalTotal,
    oneTimeTotal: breakdown.oneTimeTotal,
    monthlyUnitTotal: breakdown.recurringUnitTotal,
    maxInstallmentCount,
    expectedTotal: breakdown.expectedTotal > 0 ? breakdown.expectedTotal : null,
    grandTotal: breakdown.expectedTotal,
    currency: currency ?? null,
  };
}
