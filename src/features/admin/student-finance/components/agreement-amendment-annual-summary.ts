import type { FinancialAgreement, FinancialAgreementLine } from '../types';
import { resolveAgreementLineServiceName } from '../utils/agreement-amendment-line-display';

export interface AgreementAnnualServiceSummary {
  key: string;
  label: string;
  total: number | null;
  unitPrice: number | null;
  periodCount: number | null;
}

export interface AgreementAnnualSummary {
  total: number | null;
  services: AgreementAnnualServiceSummary[];
}

function firstFinite(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function lineKey(line: FinancialAgreementLine, index: number): string {
  const candidate = line.id ?? line.source_line_id ?? line.agreement_line_id ?? line.service_id;
  return candidate != null ? String(candidate) : `line-${index}`;
}

function isCurrentLine(line: FinancialAgreementLine): boolean {
  if (line.operational_state === 'cancelled_historical_only') return false;
  if (line.is_selected === false && line.is_mandatory !== true) return false;
  return true;
}

/**
 * Select annual agreement values that Odoo already calculated.
 * Deliberately never sums service totals and never multiplies price × periods.
 */
export function buildAgreementAnnualSummary(
  agreement?: FinancialAgreement | null,
): AgreementAnnualSummary {
  if (!agreement) return { total: null, services: [] };

  const total = firstFinite(
    agreement.financial_summary?.schedule_total,
    agreement.financial_summary?.final_total,
    agreement.financial_summary?.net_total,
    agreement.schedule_summary?.total_amount,
    agreement.net_total,
    agreement.net_amount,
    agreement.total_amount,
  );

  const sourceLines = agreement.lines?.length ? agreement.lines : agreement.source_fees ?? [];
  const services = sourceLines
    .filter(isCurrentLine)
    .map((line, index) => ({
      key: lineKey(line, index),
      label: resolveAgreementLineServiceName(line),
      total: firstFinite(line.schedule_total, line.net_amount, line.gross_amount),
      unitPrice: firstFinite(line.unit_price),
      periodCount: firstFinite(line.schedule_period_count, line.periods_count),
    }));

  return { total, services };
}
