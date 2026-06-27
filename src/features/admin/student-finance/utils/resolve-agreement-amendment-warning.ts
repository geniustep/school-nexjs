import type {
  AgreementAmendmentPricingContract,
  AgreementAmendmentWarning,
} from '../types/agreement-amendment';
import { agreementAmendmentReasonMessageKey, agreementAmendmentErrorMessageKey } from './agreement-amendment-errors';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readParams(value: unknown): Record<string, string | number> | undefined {
  const rec =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  if (!rec) return undefined;
  const params: Record<string, string | number> = {};
  for (const [key, raw] of Object.entries(rec)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      params[key] = raw;
      continue;
    }
    const text = readString(raw);
    if (text) params[key] = text;
  }
  return Object.keys(params).length ? params : undefined;
}

export function readAgreementAmendmentWarnings(value: unknown): AgreementAmendmentWarning[] {
  if (!Array.isArray(value)) return [];
  const warnings: AgreementAmendmentWarning[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      const code = item.trim();
      if (seen.has(code)) continue;
      seen.add(code);
      warnings.push({ code });
      continue;
    }

    const rec =
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : null;
    if (!rec) continue;

    const code = readString(rec.code) ?? readString(rec.message);
    if (!code) continue;
    const dedupeKey = `${code}:${readString(rec.message) ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    warnings.push({
      code,
      message: readString(rec.message),
      params: readParams(rec.params ?? rec),
    });
  }

  return warnings;
}

function buildMonthlyPriceWarningParams(
  warning: AgreementAmendmentWarning,
  pricingContract?: AgreementAmendmentPricingContract | null,
): Record<string, string | number> {
  const params: Record<string, string | number> = { ...(warning.params ?? {}) };

  if (pricingContract?.newUnitPrice != null && params.newUnitPrice == null) {
    params.newUnitPrice = pricingContract.newUnitPrice;
  }
  if (pricingContract?.affectedPeriodCount != null && params.affectedPeriodCount == null) {
    params.affectedPeriodCount = pricingContract.affectedPeriodCount;
  }
  if (
    pricingContract?.newTotalForAffectedPeriods != null &&
    params.newTotalForAffectedPeriods == null
  ) {
    params.newTotalForAffectedPeriods = pricingContract.newTotalForAffectedPeriods;
  }
  if (params.suggestedMonthlyUnitPrice == null) {
    const suggested =
      warning.params?.suggested_monthly_unit_price ??
      warning.params?.suggestedMonthlyUnitPrice ??
      (pricingContract as Record<string, unknown> | undefined)?.suggested_monthly_unit_price;
    if (typeof suggested === 'number' && Number.isFinite(suggested)) {
      params.suggestedMonthlyUnitPrice = suggested;
    }
  }

  return params;
}

export function resolveAgreementAmendmentWarningMessage(
  warning: AgreementAmendmentWarning,
  t: (key: string, params?: Record<string, string | number>) => string,
  pricingContract?: AgreementAmendmentPricingContract | null,
): string {
  const code = warning.code;
  const readyMessage = warning.message;
  if (readyMessage && readyMessage !== code) {
    return readyMessage;
  }

  const key = agreementAmendmentReasonMessageKey(code);
  if (key) {
    const params =
      code === 'monthly_unit_price_seems_high'
        ? buildMonthlyPriceWarningParams(warning, pricingContract)
        : warning.params;
    const label = t(key, params);
    if (label !== key) return label;
  }

  if (readyMessage) return readyMessage;
  return code;
}

export function readAgreementAmendmentReasonCodes(value: unknown): AgreementAmendmentWarning[] {
  return readAgreementAmendmentWarnings(value);
}

export function agreementAmendmentWarningCode(warning: AgreementAmendmentWarning): string {
  return warning.code;
}

export function resolveAgreementAmendmentBlockingMessage(
  reason: AgreementAmendmentWarning | string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const warning =
    typeof reason === 'string'
      ? ({ code: reason } satisfies AgreementAmendmentWarning)
      : reason;

  const readyMessage = warning.message;
  if (readyMessage && readyMessage !== warning.code) {
    return readyMessage;
  }

  const errorKey = agreementAmendmentErrorMessageKey(warning.code);
  if (errorKey) {
    const label = t(errorKey);
    if (label !== errorKey) return label;
  }

  const reasonKey = agreementAmendmentReasonMessageKey(warning.code);
  if (reasonKey) {
    const label = t(reasonKey);
    if (label !== reasonKey) return label;
  }

  return warning.code;
}
