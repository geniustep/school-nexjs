import type {
  AgreementScheduleItem,
  FinancialAgreement,
  FinancialAgreementLine,
} from '../types';
import { isOneTimeAgreementLine } from './agreement-amendment-line-eligibility';

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstFinite(...values: unknown[]): number | null {
  for (const value of values) {
    const number = finite(value);
    if (number != null) return number;
  }
  return null;
}

export type AgreementContextLineDisplay = {
  isOneTime: boolean;
  monthCount: number | null;
  currentPrice: number | null;
  priceMin: number | null;
  priceMax: number | null;
  total: number | null;
};

export function resolveAgreementContextCurrentTotal(
  agreement: FinancialAgreement | null | undefined,
  fallback?: number | null,
): number | null {
  return firstFinite(
    agreement?.schedule_summary?.total_amount,
    agreement?.financial_summary?.schedule_total,
    agreement?.financial_summary?.net_total,
    agreement?.net_total,
    agreement?.net_amount,
    fallback,
  );
}

export function resolveAgreementContextLineDisplay(
  line: FinancialAgreementLine,
  installments: AgreementScheduleItem[],
): AgreementContextLineDisplay {
  const isOneTime = isOneTimeAgreementLine(line as unknown as Record<string, unknown>);
  const lineId = finite(line.id);
  const lineInstallments =
    lineId == null
      ? []
      : installments.filter((item) => finite(item.agreement_line_id) === lineId);
  const amounts = lineInstallments
    .map((item) => finite(item.amount))
    .filter((value): value is number => value != null);

  const monthCount = isOneTime
    ? null
    : firstFinite(
        line.schedule_period_count,
        lineInstallments.length > 0 ? lineInstallments.length : null,
        line.periods_count,
        line.quantity,
      );

  const total =
    amounts.length > 0
      ? amounts.reduce((sum, amount) => sum + amount, 0)
      : firstFinite(line.schedule_total, line.net_amount, line.gross_amount);

  if (amounts.length > 0) {
    const priceMin = Math.min(...amounts);
    const priceMax = Math.max(...amounts);
    return {
      isOneTime,
      monthCount,
      currentPrice: priceMin === priceMax ? priceMin : null,
      priceMin,
      priceMax,
      total,
    };
  }

  return {
    isOneTime,
    monthCount,
    currentPrice: firstFinite(line.unit_price),
    priceMin: null,
    priceMax: null,
    total,
  };
}

/** Monthly operational prices from the agreement schedule, not the historical line rate. */
export function resolveAgreementSchedulePrices(
  lineId: number | null | undefined,
  installments: AgreementScheduleItem[],
): {
  periods: { id: number | null; period: string | null; amount: number }[];
  groups: { amount: number; count: number }[];
} {
  const periods = lineId == null ? [] : installments.filter(
    (row) => row.agreement_line_id === lineId &&
      row.state !== 'cancelled' && row.state !== 'waived' &&
      typeof row.amount === 'number' && Number.isFinite(row.amount),
  ).map((row) => ({
    id: typeof row.id === 'number' ? row.id : null,
    period: row.period_start ?? row.display_from ?? row.due_date ?? null,
    amount: row.amount as number,
  })).sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
  const groupMap = new Map<number, number>();
  for (const period of periods) groupMap.set(period.amount, (groupMap.get(period.amount) ?? 0) + 1);
  return {
    periods,
    groups: [...groupMap.entries()].map(([amount, count]) => ({ amount, count })).sort((a, b) => a.amount - b.amount),
  };
}

/**
 * Only one-to-one month matches are displayed as current rates.
 * A missing or ambiguous month is never filled from historical unit_price.
 */
export function resolveAgreementPeriodPrices(
  lineId: number | null | undefined,
  installments: AgreementScheduleItem[],
  options: { id: number; periodStart?: string | null; periodKey?: string | null }[],
): Record<string, number> {
  const periods = resolveAgreementSchedulePrices(lineId, installments).periods;
  const byMonth = new Map<string, number[]>();
  for (const row of periods) {
    const month = row.period?.match(/^\d{4}-\d{2}/)?.[0];
    if (month) byMonth.set(month, [...(byMonth.get(month) ?? []), row.amount]);
  }
  const out: Record<string, number> = {};
  for (const option of options) {
    const month = (option.periodStart ?? option.periodKey ?? '').match(/^\d{4}-\d{2}/)?.[0];
    const prices = month ? byMonth.get(month) : null;
    if (prices?.length === 1) out[String(option.id)] = prices[0]!;
  }
  return out;
}
