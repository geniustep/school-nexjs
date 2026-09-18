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
