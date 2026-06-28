import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  AgreementLineQuantityEditContract,
  AgreementLineQuantitySemantics,
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

export function normalizeFinancialAgreement(raw: unknown): FinancialAgreement | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as FinancialAgreement;
  const id = readFiniteNumber((raw as Record<string, unknown>).id);
  if (id == null) return source;

  const lines = normalizeFinancialAgreementLines(source.lines);
  const source_fees = normalizeFinancialAgreementLines(source.source_fees);

  return {
    ...source,
    id,
    lines: lines.length > 0 ? lines : source.lines,
    source_fees: source_fees.length > 0 ? source_fees : source.source_fees,
    net_total: normalizeMoneyValue((raw as Record<string, unknown>).net_total) ?? source.net_total,
    schedule_summary: source.schedule_summary
      ? {
          ...source.schedule_summary,
          total_amount:
            normalizeMoneyValue(
              (source.schedule_summary as Record<string, unknown>).total_amount,
            ) ?? source.schedule_summary.total_amount,
        }
      : source.schedule_summary,
  };
}
