import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import { sortAgreementAmendmentPeriodOptions } from './sort-agreement-amendment-period-options';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readPeriodOption(raw: unknown): AgreementAmendmentPeriodOption | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const id = readFiniteNumber(rec.id);
  if (id == null) return null;
  const label =
    readString(rec.label) ??
    readString(rec.name) ??
    readString(rec.period_label) ??
    readString(rec.periodKey) ??
    readString(rec.period_key) ??
    String(id);
  const selectable = readBoolean(rec.selectable);
  return {
    id,
    label,
    periodKey: readString(rec.periodKey) ?? readString(rec.period_key),
    periodStart:
      readString(rec.periodStart) ??
      readString(rec.period_start) ??
      readString(rec.date_start),
    periodEnd:
      readString(rec.periodEnd) ??
      readString(rec.period_end) ??
      readString(rec.date_end),
    sequence: readFiniteNumber(rec.sequence),
    selectable: selectable ?? true,
    disabledReason:
      readString(rec.disabledReason) ??
      readString(rec.disabled_reason) ??
      readString(rec.block_reason),
  };
}

export function normalizeAgreementAmendmentPeriodOptions(raw: unknown): AgreementAmendmentPeriodOption[] {
  if (Array.isArray(raw)) {
    return normalizeAgreementAmendmentPeriodOptions({ items: raw });
  }

  const root = asRecord(raw) ?? {};
  const candidates = [
    root.open_periods,
    root.available_periods,
    root.effective_periods,
    root.effective_period,
    root.periods,
    root.items,
    asRecord(root.data)?.open_periods,
    asRecord(root.data)?.available_periods,
    asRecord(root.data)?.effective_periods,
    asRecord(root.data)?.periods,
  ];

  const map = new Map<number, AgreementAmendmentPeriodOption>();
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const option = readPeriodOption(item);
      if (option) map.set(option.id, option);
    }
  }

  return sortAgreementAmendmentPeriodOptions([...map.values()]);
}

export function mergeAgreementAmendmentPeriodOptions(
  ...groups: unknown[]
): AgreementAmendmentPeriodOption[] {
  const map = new Map<number, AgreementAmendmentPeriodOption>();
  for (const group of groups) {
    if (Array.isArray(group)) {
      for (const option of normalizeAgreementAmendmentPeriodOptions(group)) {
        if (!map.has(option.id)) map.set(option.id, option);
      }
      continue;
    }
    for (const option of normalizeAgreementAmendmentPeriodOptions(group)) {
      if (!map.has(option.id)) map.set(option.id, option);
    }
  }
  return sortAgreementAmendmentPeriodOptions([...map.values()]);
}
