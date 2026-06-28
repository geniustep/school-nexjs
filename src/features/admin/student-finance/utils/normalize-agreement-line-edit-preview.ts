import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  AgreementLineEditPreviewSnapshot,
  NormalizedAgreementLineEditPreview,
} from '../types/agreement-line-edit';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readReasonCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      codes.push(item.trim());
      continue;
    }
    const rec = asRecord(item);
    const code = readString(rec?.code) ?? readString(rec?.message);
    if (code) codes.push(code);
  }
  return [...new Set(codes)];
}

function readSnapshot(raw: unknown, lineId?: number): AgreementLineEditPreviewSnapshot | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const quantity = readFiniteNumber(rec.quantity);
  const periods_count =
    readFiniteNumber(rec.periods_count) ?? readFiniteNumber(rec.period_count) ?? quantity;

  return {
    line_id: readFiniteNumber(rec.line_id) ?? readFiniteNumber(rec.id) ?? lineId ?? undefined,
    quantity,
    periods_count,
    unit_price: normalizeMoneyValue(rec.unit_price),
    discount_type: readString(rec.discount_type),
    discount_value: readFiniteNumber(rec.discount_value),
    discount_amount: normalizeMoneyValue(rec.discount_amount),
    net_amount: normalizeMoneyValue(rec.net_amount),
    schedule_total:
      normalizeMoneyValue(rec.schedule_total) ??
      normalizeMoneyValue(rec.expected_schedule_total) ??
      normalizeMoneyValue(rec.schedule_amount) ??
      normalizeMoneyValue(rec.installments_total),
  };
}

function findLinePreviewEntry(root: Record<string, unknown>, lineId?: number): Record<string, unknown> | null {
  const lines = root.lines;
  if (Array.isArray(lines)) {
    for (const entry of lines) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const entryId =
        readFiniteNumber(rec.line_id) ?? readFiniteNumber(rec.id) ?? readFiniteNumber(rec.lineId);
      if (lineId == null || entryId === lineId) return rec;
    }
  }

  const line = asRecord(root.line);
  if (line) return line;

  if (root.before != null || root.after != null) return root;

  return root;
}

export function normalizeAgreementLineEditPreview(
  raw: unknown,
  lineId?: number,
): NormalizedAgreementLineEditPreview {
  const root = asRecord(raw) ?? {};
  const previewRoot = asRecord(root.preview) ?? root;
  const lineEntry = findLinePreviewEntry(previewRoot, lineId) ?? previewRoot;

  const beforeRaw =
    lineEntry.before ??
    lineEntry.current ??
    previewRoot.before ??
    previewRoot.current;
  const afterRaw =
    lineEntry.after ??
    lineEntry.proposed ??
    lineEntry.expected ??
    previewRoot.after ??
    previewRoot.proposed;

  const blockingReasons = [
    ...readReasonCodes(previewRoot.blocking_reasons),
    ...readReasonCodes(root.blocking_reasons),
    ...readReasonCodes(lineEntry.blocking_reasons),
  ];

  const errorMessage =
    readString(previewRoot.error_message) ??
    readString(previewRoot.message) ??
    readString(root.error_message) ??
    readString(lineEntry.error_message) ??
    (previewRoot.error === true ? readString(previewRoot.reason) : null);

  const blockedExplicit =
    previewRoot.blocked === true ||
    root.blocked === true ||
    lineEntry.blocked === true ||
    previewRoot.status === 'blocked' ||
    previewRoot.status === 'error';

  const allowedExplicit =
    typeof previewRoot.allowed === 'boolean'
      ? previewRoot.allowed
      : typeof root.allowed === 'boolean'
        ? root.allowed
        : typeof lineEntry.allowed === 'boolean'
          ? lineEntry.allowed
          : !blockedExplicit && blockingReasons.length === 0 && !errorMessage;

  const requiresScheduleRegeneration =
    previewRoot.requires_schedule_regeneration === true ||
    root.requires_schedule_regeneration === true ||
    lineEntry.requires_schedule_regeneration === true ||
    previewRoot.schedule_regeneration_required === true ||
    (Array.isArray(lineEntry.warnings) &&
      lineEntry.warnings.some(
        (item) =>
          typeof item === 'string' &&
          /schedule|regenerat|جدول|أقساط/i.test(item),
      ));

  return {
    allowed: allowedExplicit && !blockedExplicit && !errorMessage,
    blocked: blockedExplicit || blockingReasons.length > 0 || !!errorMessage,
    errorMessage,
    requiresScheduleRegeneration,
    before: readSnapshot(beforeRaw, lineId),
    after: readSnapshot(afterRaw, lineId),
    reasonCodes: blockingReasons,
  };
}
