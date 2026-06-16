import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type { FinanceCurrency, StudentFinanceSummary, StudentFinanceWorkspace } from '../types';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickMoney(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = normalizeMoneyValue(source[key]);
    if (value != null) return value;
  }
  return undefined;
}

function normalizeWorkspaceCurrency(
  summaryRaw: Record<string, unknown>,
  workspaceRaw: Record<string, unknown>,
): FinanceCurrency | null | undefined {
  const candidates = [
    summaryRaw.currency,
    readRecord(workspaceRaw.totals).currency,
    readRecord(workspaceRaw.current_agreement).currency,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name : null;
    if (!name) continue;
    return {
      id: typeof raw.id === 'number' ? raw.id : 0,
      name,
      symbol: typeof raw.symbol === 'string' ? raw.symbol : undefined,
      decimal_places: typeof raw.decimal_places === 'number' ? raw.decimal_places : undefined,
    };
  }
  return null;
}

export function normalizeStudentFinanceSummary(raw: unknown): StudentFinanceSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const nested = readRecord(source.totals);

  return {
    total_agreed: pickMoney(source, ['total_agreed']) ?? pickMoney(nested, ['total_agreed']),
    total_due:
      pickMoney(source, ['total_due', 'total_assessed', 'total_amount']) ??
      pickMoney(nested, ['total_due', 'total_assessed', 'total_amount']),
    confirmed_paid:
      pickMoney(source, ['confirmed_paid', 'total_paid', 'paid_amount', 'settled_amount']) ??
      pickMoney(nested, ['confirmed_paid', 'total_paid', 'paid_amount', 'settled_amount']),
    pending_cheques:
      pickMoney(source, ['pending_cheques', 'pending_cheque_amount', 'cheques_pending_amount']) ??
      pickMoney(nested, ['pending_cheques', 'pending_cheque_amount', 'cheques_pending_amount']),
    remaining:
      pickMoney(source, ['remaining', 'total_remaining', 'total_outstanding', 'remaining_amount', 'balance']) ??
      pickMoney(nested, ['remaining', 'total_remaining', 'total_outstanding', 'remaining_amount', 'balance']),
    uncovered:
      pickMoney(source, ['uncovered', 'uncovered_amount']) ??
      pickMoney(nested, ['uncovered', 'uncovered_amount']),
    overdue:
      pickMoney(source, ['overdue', 'total_overdue', 'overdue_amount']) ??
      pickMoney(nested, ['overdue', 'total_overdue', 'overdue_amount']),
    overdue_installments_count:
      typeof source.overdue_installments_count === 'number'
        ? source.overdue_installments_count
        : typeof nested.overdue_installments_count === 'number'
          ? nested.overdue_installments_count
          : undefined,
    currency: undefined,
  };
}

export function normalizeStudentFinanceWorkspace(
  data: StudentFinanceWorkspace | null | undefined,
): StudentFinanceWorkspace | null {
  if (!data) return null;
  const summary = normalizeStudentFinanceSummary(data.summary);
  if (!summary) return data;

  const workspaceRaw = data as StudentFinanceWorkspace & Record<string, unknown>;
  summary.currency = normalizeWorkspaceCurrency(readRecord(data.summary), workspaceRaw);

  return {
    ...data,
    summary,
  };
}

export function hasFinanceSummaryMetrics(summary: StudentFinanceSummary | null | undefined): boolean {
  if (!summary) return false;
  return [
    summary.total_due,
    summary.total_agreed,
    summary.confirmed_paid,
    summary.pending_cheques,
    summary.remaining,
    summary.uncovered,
    summary.overdue,
  ].some((value) => value != null && value > 0);
}

export function isStudentFinanceSummaryInconsistent(input: {
  workspace: StudentFinanceWorkspace | null | undefined;
  installmentsLoaded: boolean;
  installmentRowCount: number;
}): boolean {
  const { workspace, installmentsLoaded, installmentRowCount } = input;
  if (!workspace?.summary) return false;
  if (hasFinanceSummaryMetrics(workspace.summary)) return false;

  const installmentsSummary = workspace.installments_summary;
  if ((installmentsSummary?.upcoming_count ?? 0) > 0) return true;
  if ((installmentsSummary?.overdue_count ?? 0) > 0) return true;
  if (installmentsLoaded && installmentRowCount > 0) return true;

  return false;
}

export function resolveStudentFinanceSummaryDisplayValue(
  value: number | null | undefined,
  summaryUnavailable: boolean,
): number | null | undefined {
  if (!summaryUnavailable) return value;
  if (value == null) return null;
  if (Number(value) === 0) return null;
  return value;
}
