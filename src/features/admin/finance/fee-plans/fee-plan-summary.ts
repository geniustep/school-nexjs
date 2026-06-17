import type { DraftFeePlanLine, FeePlanSummaryTotals } from './fee-plan-types';

function isMonthly(frequency: string): boolean {
  return frequency === 'monthly';
}

function isOneTime(frequency: string): boolean {
  return frequency === 'once' || frequency === 'one_time';
}

export function computeFeePlanSummary(
  lines: DraftFeePlanLine[],
  currency?: string | null,
): FeePlanSummaryTotals {
  let requiredCount = 0;
  let optionalCount = 0;
  let requiredTotal = 0;
  let optionalTotal = 0;
  let oneTimeTotal = 0;
  let monthlyUnitTotal = 0;
  let maxInstallmentCount = 0;
  let monthlyPeriods: number | null = null;

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

    if (isOneTime(line.frequency)) {
      oneTimeTotal += line.amount;
    } else if (isMonthly(line.frequency)) {
      monthlyUnitTotal += line.amount;
      if (installments > 1) {
        monthlyPeriods =
          monthlyPeriods == null ? installments : Math.max(monthlyPeriods, installments);
      }
    }
  }

  let expectedTotal: number | null = null;
  if (monthlyPeriods != null && monthlyPeriods > 1) {
    expectedTotal = oneTimeTotal + monthlyUnitTotal * monthlyPeriods;
  }

  const grandTotal = expectedTotal ?? oneTimeTotal + monthlyUnitTotal;

  return {
    lineCount: lines.length,
    requiredCount,
    optionalCount,
    requiredTotal,
    optionalTotal,
    oneTimeTotal,
    monthlyUnitTotal,
    maxInstallmentCount,
    expectedTotal,
    grandTotal,
    currency: currency ?? null,
  };
}
