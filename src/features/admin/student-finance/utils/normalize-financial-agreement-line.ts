import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  AgreementLineQuantityEditContract,
  AgreementLineQuantitySemantics,
  AgreementScheduleItem,
  FinancialAgreement,
  FinancialAgreementLine,
} from '../types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const QUANTITY_SEMANTICS: AgreementLineQuantitySemantics[] = [
  'period_count',
  'fixed_one_time',
  'item_count',
];

function normalizeQuantitySemantics(value: unknown): AgreementLineQuantitySemantics | undefined {
  const slug = readString(value)?.toLowerCase();
  if (slug && QUANTITY_SEMANTICS.includes(slug as AgreementLineQuantitySemantics)) {
    return slug as AgreementLineQuantitySemantics;
  }
  return undefined;
}

export function normalizeAgreementLineQuantityEditContract(
  raw: unknown,
): AgreementLineQuantityEditContract | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const quantity_semantics = normalizeQuantitySemantics(rec.quantity_semantics);
  const current_quantity = readFiniteNumber(rec.current_quantity);
  const max_quantity = readFiniteNumber(rec.max_quantity);
  const quantity_allowed = readBoolean(rec.quantity_allowed);
  const quantity_readonly_reason = readString(rec.quantity_readonly_reason);

  if (
    quantity_semantics == null &&
    current_quantity == null &&
    max_quantity == null &&
    quantity_allowed == null &&
    quantity_readonly_reason == null
  ) {
    return null;
  }

  return {
    quantity_semantics,
    current_quantity,
    max_quantity,
    quantity_allowed,
    quantity_readonly_reason,
  };
}

export function normalizeFinancialAgreementLine(raw: unknown): FinancialAgreementLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = readFiniteNumber(o.id);
  const service_id = readFiniteNumber(o.service_id);

  const quantity_edit_contract = normalizeAgreementLineQuantityEditContract(o.quantity_edit_contract);

  const line: FinancialAgreementLine = {
    ...(raw as FinancialAgreementLine),
    id,
    source_line_id: readFiniteNumber(o.source_line_id) ?? (raw as FinancialAgreementLine).source_line_id,
    agreement_line_id:
      readFiniteNumber(o.agreement_line_id) ?? (raw as FinancialAgreementLine).agreement_line_id,
    service_id,
    period_amendable: readBoolean(o.period_amendable) ?? (raw as FinancialAgreementLine).period_amendable,
    amendment_block_reason:
      readString(o.amendment_block_reason) ?? (raw as FinancialAgreementLine).amendment_block_reason,
    duplicate_service_warning:
      o.duplicate_service_warning === true ||
      (raw as FinancialAgreementLine).duplicate_service_warning === true,
    quantity: readFiniteNumber(o.quantity) ?? (raw as FinancialAgreementLine).quantity,
    periods_count: readFiniteNumber(o.periods_count),
    schedule_period_count: readFiniteNumber(o.schedule_period_count),
    schedule_total: normalizeMoneyValue(o.schedule_total) ?? undefined,
    unit_price: normalizeMoneyValue(o.unit_price) ?? (raw as FinancialAgreementLine).unit_price,
    gross_amount: normalizeMoneyValue(o.gross_amount) ?? (raw as FinancialAgreementLine).gross_amount,
    discount_amount:
      normalizeMoneyValue(o.discount_amount) ?? (raw as FinancialAgreementLine).discount_amount,
    net_amount: normalizeMoneyValue(o.net_amount) ?? (raw as FinancialAgreementLine).net_amount,
    discount_value: readFiniteNumber(o.discount_value) ?? (raw as FinancialAgreementLine).discount_value,
    quantity_edit_contract,
    internal_note: readString(o.internal_note) ?? (raw as FinancialAgreementLine).internal_note,
  };

  if (id == null && service_id == null) return null;
  if (id == null && readFiniteNumber(o.agreement_line_id) == null && readFiniteNumber(o.source_line_id) == null) {
    return null;
  }
  return line;
}

export function normalizeFinancialAgreementLines(raw: unknown): FinancialAgreementLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: FinancialAgreementLine[] = [];
  for (const entry of raw) {
    const line = normalizeFinancialAgreementLine(entry);
    if (line) lines.push(line);
  }
  return lines;
}

function normalizeScheduleSummary(
  raw: unknown,
): { installment_count?: number; total_amount?: number } | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const installment_count = readFiniteNumber(rec.installment_count);
  const total_amount = normalizeMoneyValue(rec.total_amount) ?? undefined;
  if (installment_count == null && total_amount == null) {
    return { ...(raw as { installment_count?: number; total_amount?: number }) };
  }
  return {
    ...(raw as { installment_count?: number; total_amount?: number }),
    installment_count,
    total_amount,
  };
}

export function normalizeAgreementScheduleItem(raw: unknown): AgreementScheduleItem | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const id = readFiniteNumber(rec.id);
  const amount = normalizeMoneyValue(rec.amount) ?? undefined;
  const state = readString(rec.state) ?? undefined;
  return {
    ...(raw as AgreementScheduleItem),
    id,
    sequence: readFiniteNumber(rec.sequence),
    period_start: readString(rec.period_start),
    period_end: readString(rec.period_end),
    display_from: readString(rec.display_from),
    due_date: readString(rec.due_date),
    amount,
    state,
  };
}

export function normalizeAgreementScheduleItems(raw: unknown): AgreementScheduleItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: AgreementScheduleItem[] = [];
  for (const entry of raw) {
    const item = normalizeAgreementScheduleItem(entry);
    if (item) items.push(item);
  }
  return items;
}

export function normalizeFinancialAgreement(raw: unknown): FinancialAgreement | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as FinancialAgreement;
  const row = raw as Record<string, unknown>;
  const id = readFiniteNumber(row.id);
  if (id == null) return source;

  const lines = normalizeFinancialAgreementLines(source.lines);
  const source_fees = normalizeFinancialAgreementLines(source.source_fees);
  const installments = normalizeAgreementScheduleItems(row.installments);
  const historical_installments = normalizeAgreementScheduleItems(row.historical_installments);
  const schedule_summary = normalizeScheduleSummary(row.schedule_summary) ?? source.schedule_summary;
  const historical_schedule_summary =
    normalizeScheduleSummary(row.historical_schedule_summary) ?? source.historical_schedule_summary;

  return {
    ...source,
    id,
    lines: lines.length > 0 ? lines : source.lines,
    source_fees: source_fees.length > 0 ? source_fees : source.source_fees,
    net_total: normalizeMoneyValue(row.net_total) ?? source.net_total,
    installments: installments ?? source.installments,
    schedule_summary,
    historical_installments: historical_installments ?? source.historical_installments,
    historical_schedule_summary,
  };
}
