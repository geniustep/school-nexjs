import type { EnrollmentPlanLine } from '@/types/student-enrollment-finance';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

function readOptionalLine(value: unknown): EnrollmentPlanLine | null {
  const record = asRecord(value);
  if (!record) return null;
  const lineId = asNumber(record.line_id) ?? asNumber(record.id);
  const feeTypeName = asString(record.fee_type_name) ?? asString(record.name);
  if (lineId == null || !feeTypeName) return null;

  return {
    line_id: lineId,
    fee_type_id: asNumber(record.fee_type_id),
    fee_type_name: feeTypeName,
    frequency: asString(record.frequency),
    base_amount: asNumber(record.base_amount),
    amount: asNumber(record.amount),
    currency: asString(record.currency),
    installment_count: asNumber(record.installment_count),
    installment_amount: asNumber(record.installment_amount),
    total_amount: asNumber(record.total_amount),
    monthly_installment_amount: asNumber(record.monthly_installment_amount),
    is_mandatory: asBoolean(record.is_mandatory) ?? false,
    is_monthly: asBoolean(record.is_monthly),
    is_one_time: asBoolean(record.is_one_time),
    is_optional: asBoolean(record.is_optional) ?? true,
    pricing_mode: asString(record.pricing_mode),
    due_date: asString(record.due_date),
    original_total: asNumber(record.original_total),
    suggested_total: asNumber(record.suggested_total),
  };
}

export function readFullRegistrationOptionalLines(payload: unknown): EnrollmentPlanLine[] {
  const record = asRecord(payload);
  if (!record) return [];

  const rawLines = Array.isArray(record.lines)
    ? record.lines
    : Array.isArray(record.optional_lines)
      ? record.optional_lines
      : [];

  return rawLines
    .map(readOptionalLine)
    .filter(
      (line): line is EnrollmentPlanLine =>
        line != null && line.is_optional === true && line.fee_type_id != null,
    );
}
