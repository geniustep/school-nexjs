import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  FeePlanInstallmentScheduleItem,
  FeePlanLine,
  FeePlanLineFeeType,
} from '@/types/finance';

function normalizeFeeType(raw: unknown): FeePlanLineFeeType | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (typeof o.code !== 'string' || !o.code.trim()) return null;
  if (typeof o.name !== 'string' || !o.name.trim()) return null;
  if (typeof o.category !== 'string' || !o.category.trim()) return null;
  return {
    id,
    code: o.code.trim(),
    name: o.name.trim(),
    category: o.category.trim(),
  };
}

function normalizeInstallmentSchedule(raw: unknown): FeePlanInstallmentScheduleItem[] {
  if (!Array.isArray(raw)) return [];
  const items: FeePlanInstallmentScheduleItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const sequence = Number(o.sequence);
    const amount = normalizeMoneyValue(o.amount);
    const dueDate = typeof o.due_date === 'string' ? o.due_date.trim() : '';
    if (!Number.isFinite(sequence) || sequence <= 0 || amount == null || !dueDate) continue;
    items.push({ sequence, due_date: dueDate, amount });
  }
  return items.sort((a, b) => a.sequence - b.sequence);
}

/** Normalize a fee plan line; returns null when required contract fields are missing. */
export function normalizeFeePlanLine(raw: unknown): FeePlanLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (typeof o.is_optional !== 'boolean') return null;

  const amount = normalizeMoneyValue(o.amount);
  if (amount == null) return null;

  const subtotalRaw = normalizeMoneyValue(o.subtotal);
  const subtotal = subtotalRaw ?? amount;

  const feeType = normalizeFeeType(o.fee_type);
  const feeTypeId = feeType?.id ?? Number(o.fee_type_id);
  if (!Number.isFinite(feeTypeId) || feeTypeId <= 0) return null;

  const name =
    (typeof o.name === 'string' && o.name.trim()) ||
    feeType?.name ||
    (typeof o.fee_type_name === 'string' ? o.fee_type_name.trim() : '') ||
    '';

  const installmentCountRaw = Number(o.installment_count);
  const schedule = normalizeInstallmentSchedule(o.installment_schedule);
  const installment_count =
    Number.isFinite(installmentCountRaw) && installmentCountRaw > 0
      ? installmentCountRaw
      : schedule.length > 0
        ? schedule.length
        : 1;

  return {
    id,
    fee_type_id: feeTypeId,
    fee_type: feeType ?? undefined,
    fee_type_name: feeType?.name ?? (typeof o.fee_type_name === 'string' ? o.fee_type_name : undefined),
    name,
    description: typeof o.description === 'string' || o.description === false ? o.description : undefined,
    amount,
    quantity: Number.isFinite(Number(o.quantity)) ? Number(o.quantity) : undefined,
    subtotal,
    due_rule: typeof o.due_rule === 'string' ? o.due_rule : undefined,
    due_date: typeof o.due_date === 'string' ? o.due_date : o.due_date === null ? null : undefined,
    installment_count,
    installment_schedule: schedule.length ? schedule : undefined,
    is_optional: o.is_optional,
  };
}

export function normalizeFeePlanLines(raw: unknown): FeePlanLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: FeePlanLine[] = [];
  for (const entry of raw) {
    const line = normalizeFeePlanLine(entry);
    if (line) lines.push(line);
  }
  return lines;
}
