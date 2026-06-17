import { resolveFinanceCurrency } from '@/lib/i18n/format-money';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

/** Stable finance currency code for student finance UI — never throws. */
export function resolveStudentFinanceCurrency(input: {
  financialOverview?: StudentFinancialOverview | null;
  workspaceSummary?: { currency?: unknown } | null;
  collectibleCurrency?: unknown;
  fallback?: string;
}): string {
  const overviewCurrency = input.financialOverview?.totals?.currency;
  const workspaceCurrency = input.workspaceSummary?.currency;
  return resolveFinanceCurrency(
    overviewCurrency ?? workspaceCurrency ?? input.collectibleCurrency ?? input.fallback,
  );
}
