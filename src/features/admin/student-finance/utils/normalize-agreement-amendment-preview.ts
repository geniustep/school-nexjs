import type {
  AgreementAmendmentInstallmentPreview,
  AgreementAmendmentPreviewResponse,
  NormalizedAgreementAmendmentPreview,
} from '../types/agreement-amendment';
import { normalizeAgreementAmendmentPricingContract } from './agreement-amendment-pricing-contract';
import { mergeAgreementAmendmentPeriodOptions } from './normalize-agreement-amendment-period-options';
import { readAgreementAmendmentReasonCodes, readAgreementAmendmentWarnings } from './resolve-agreement-amendment-warning';

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

function readPeriodLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      labels.push(item.trim());
      continue;
    }
    const rec = asRecord(item);
    const label =
      readString(rec?.label) ??
      readString(rec?.name) ??
      readString(rec?.period_label) ??
      readString(rec?.period_name);
    if (label) labels.push(label);
  }
  return [...new Set(labels)];
}

function readInstallmentPreviews(value: unknown): AgreementAmendmentInstallmentPreview[] {
  if (!Array.isArray(value)) return [];
  const items: AgreementAmendmentInstallmentPreview[] = [];
  for (const entry of value) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const label =
      readString(rec.label) ??
      readString(rec.name) ??
      readString(rec.period_label) ??
      readString(rec.display_label) ??
      (readFiniteNumber(rec.id) != null ? String(readFiniteNumber(rec.id)) : null);
    if (!label) continue;
    items.push({
      id: readFiniteNumber(rec.id),
      label,
      amount: readFiniteNumber(rec.amount),
      state: readString(rec.state),
    });
  }
  return items;
}

export function normalizeAgreementAmendmentPreview(
  raw: unknown,
): NormalizedAgreementAmendmentPreview {
  const root = asRecord(raw) ?? {};
  const preview = asRecord(root.preview) ?? root;
  const data = preview as AgreementAmendmentPreviewResponse;

  const blockingReasons = [
    ...readAgreementAmendmentReasonCodes(data.blocking_reasons),
    ...readAgreementAmendmentReasonCodes(root.blocking_reasons),
    ...(data.allowed === false && readString(data.reason)
      ? [{ code: readString(data.reason)! }]
      : []),
  ].filter((reason, index, list) => list.findIndex((item) => item.code === reason.code) === index);
  const warnings = readAgreementAmendmentWarnings(data.warnings);
  for (const warning of readAgreementAmendmentWarnings(root.warnings)) {
    if (!warnings.some((item) => item.code === warning.code && item.message === warning.message)) {
      warnings.push(warning);
    }
  }

  const allowedExplicit =
    typeof data.allowed === 'boolean'
      ? data.allowed
      : typeof root.allowed === 'boolean'
        ? root.allowed
        : blockingReasons.length === 0;

  const pricingContract =
    normalizeAgreementAmendmentPricingContract(data.pricing_contract) ??
    normalizeAgreementAmendmentPricingContract(root.pricing_contract);

  return {
    allowed: allowedExplicit,
    amountBefore:
      readFiniteNumber(data.amount_before) ?? readFiniteNumber(root.amount_before),
    amountAfter: readFiniteNumber(data.amount_after) ?? readFiniteNumber(root.amount_after),
    delta: readFiniteNumber(data.delta) ?? readFiniteNumber(root.delta),
    currency: readString(data.currency) ?? readString(root.currency),
    pricingContract,
    affectedPeriods: [
      ...new Set([
        ...readPeriodLabels(data.affected_periods),
        ...readPeriodLabels(root.affected_periods),
      ]),
    ],
    lockedPeriods: [
      ...new Set([
        ...readPeriodLabels(data.locked_periods),
        ...readPeriodLabels(root.locked_periods),
      ]),
    ],
    warnings,
    blockingReasons,
    createdInstallments: [
      ...readInstallmentPreviews(data.created_installments),
      ...readInstallmentPreviews(data.created_installments_preview),
      ...readInstallmentPreviews(root.created_installments),
      ...readInstallmentPreviews(root.created_installments_preview),
    ],
    updatedInstallments: [
      ...readInstallmentPreviews(data.updated_installments),
      ...readInstallmentPreviews(data.updated_installments_preview),
      ...readInstallmentPreviews(root.updated_installments),
      ...readInstallmentPreviews(root.updated_installments_preview),
    ],
    cancelledInstallments: [
      ...readInstallmentPreviews(data.cancelled_installments),
      ...readInstallmentPreviews(data.cancelled_installments_preview),
      ...readInstallmentPreviews(root.cancelled_installments),
      ...readInstallmentPreviews(root.cancelled_installments_preview),
    ],
    openPeriods: mergeAgreementAmendmentPeriodOptions(
      data.open_periods,
      data.available_periods,
      data.effective_periods,
      data.effective_period,
      root.open_periods,
      root.available_periods,
      root.effective_periods,
      root.effective_period,
    ),
  };
}
