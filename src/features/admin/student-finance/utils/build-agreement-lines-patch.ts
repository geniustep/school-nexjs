import type { FinancialAgreementLine } from '../types';

export type AgreementLineReasonMode = 'add' | 'edit' | 'delete';

export type AgreementLineReasonContext = {
  mode: AgreementLineReasonMode;
  discountType: string;
  discountValue?: number;
  unitPrice?: number;
  defaultPrice?: number | null;
};

export type AgreementLineReasonKind = 'optional' | 'discount' | 'special_price' | 'delete';

export function hasAgreementLineDiscount(discountType: string, discountValue?: number | null): boolean {
  if (discountType === 'none' || !discountType) return false;
  return Number(discountValue) > 0;
}

export function resolveDefaultUnitPrice(input: {
  service?: { default_amount?: number | null } | null;
  tariff?: { unit_price?: number | null } | null;
}): number | null {
  if (input.tariff?.unit_price != null && Number.isFinite(input.tariff.unit_price)) {
    return input.tariff.unit_price;
  }
  const serviceDefault = input.service?.default_amount;
  if (serviceDefault != null && Number.isFinite(serviceDefault) && serviceDefault > 0) {
    return serviceDefault;
  }
  return null;
}

export function isSpecialUnitPrice(unitPrice: number, defaultPrice?: number | null): boolean {
  if (defaultPrice == null || !Number.isFinite(defaultPrice)) return false;
  return Math.abs(unitPrice - defaultPrice) > 0.001;
}

export function resolveAgreementLineReasonKind(context: AgreementLineReasonContext): AgreementLineReasonKind {
  if (context.mode === 'delete') return 'delete';
  if (hasAgreementLineDiscount(context.discountType, context.discountValue)) return 'discount';
  if (context.mode === 'add' && isSpecialUnitPrice(context.unitPrice ?? 0, context.defaultPrice)) {
    return 'special_price';
  }
  return 'optional';
}

export function isAgreementLineReasonRequired(context: AgreementLineReasonContext): boolean {
  return resolveAgreementLineReasonKind(context) !== 'optional';
}

export function validateAgreementLineReason(
  context: AgreementLineReasonContext,
  reason: string,
): { ok: true } | { ok: false; errorKey: string } {
  const kind = resolveAgreementLineReasonKind(context);
  if (kind === 'optional') return { ok: true };
  if (!reason.trim()) {
    const errorKeys: Record<Exclude<AgreementLineReasonKind, 'optional'>, string> = {
      discount: 'discountReasonRequired',
      special_price: 'specialPriceReasonRequired',
      delete: 'deleteReasonRequired',
    };
    return { ok: false, errorKey: errorKeys[kind] };
  }
  return { ok: true };
}

export function computeAgreementLineAmounts(input: {
  unitPrice: number;
  quantity: number;
  discountType: string;
  discountValue: number;
}): { gross: number; discount: number; net: number } {
  const gross = input.unitPrice * input.quantity;
  let discount = 0;
  if (input.discountType === 'percent') {
    discount = gross * (input.discountValue / 100);
  } else if (input.discountType === 'fixed') {
    discount = input.discountValue;
  }
  discount = Math.min(Math.max(0, discount), gross);
  return { gross, discount, net: Math.max(0, gross - discount) };
}

export type AgreementLinePatchInput = {
  service_id: number;
  tariff_id?: number | null;
  quantity?: number;
  unit_price?: number;
  discount_type?: string | null;
  discount_value?: number | null;
  is_selected?: boolean;
};

export type AgreementLinesPatchOperation = 'add' | 'update' | 'delete';

export function countPatchableAgreementLines(lines: FinancialAgreementLine[]): number {
  return lines.filter((line) => line.id != null && line.service_id != null).length;
}

/** Guards full-replace PATCH payloads from accidental mass line drops. */
export function validateAgreementLinesReplacePatch(input: {
  sourceLines: FinancialAgreementLine[];
  operation: AgreementLinesPatchOperation;
  payload: { lines: Array<{ id?: number }> };
  excludeLineId?: number;
  updateLineId?: number;
  agreementNetAmount?: number | null;
}): { ok: true } | { ok: false; reason: string } {
  const patchable = countPatchableAgreementLines(input.sourceLines);
  const sourceCount = input.sourceLines.length;

  if (sourceCount > 0 && patchable < sourceCount) {
    return { ok: false, reason: 'incomplete_patchable_lines' };
  }

  const agreementNet = input.agreementNetAmount ?? 0;
  if (sourceCount === 0 && agreementNet > 0) {
    return { ok: false, reason: 'lines_not_loaded' };
  }

  const outCount = input.payload.lines.length;

  if (input.operation === 'delete') {
    if (patchable === 0) return { ok: false, reason: 'empty_source' };
    if (input.excludeLineId == null) return { ok: false, reason: 'missing_target' };
    if (!input.sourceLines.some((line) => line.id === input.excludeLineId)) {
      return { ok: false, reason: 'missing_target' };
    }
    if (outCount !== patchable - 1) return { ok: false, reason: 'unexpected_delete_count' };
    return { ok: true };
  }

  if (input.operation === 'update') {
    if (patchable === 0) return { ok: false, reason: 'empty_source' };
    if (input.updateLineId == null) return { ok: false, reason: 'missing_target' };
    if (!input.sourceLines.some((line) => line.id === input.updateLineId)) {
      return { ok: false, reason: 'missing_target' };
    }
    if (outCount !== patchable) return { ok: false, reason: 'unexpected_update_count' };
    return { ok: true };
  }

  if (patchable > 0 && outCount !== patchable + 1) {
    return { ok: false, reason: 'unexpected_add_count' };
  }
  if (patchable === 0 && outCount !== 1) {
    return { ok: false, reason: 'unexpected_add_count' };
  }
  return { ok: true };
}

export function serializeAgreementLineForPatch(line: FinancialAgreementLine): AgreementLinePatchInput & { id: number } {
  const discountType =
    (line as FinancialAgreementLine & { discount_type?: string | null }).discount_type ?? 'none';
  const discountValue =
    (line as FinancialAgreementLine & { discount_value?: number | null }).discount_value ??
    line.discount_amount ??
    0;

  return {
    id: line.id!,
    service_id: line.service_id!,
    tariff_id: line.tariff_id ?? null,
    quantity: line.quantity ?? 1,
    unit_price: line.unit_price,
    discount_type: discountType,
    discount_value: discountValue,
    is_selected: line.is_selected ?? true,
  };
}

export function buildAgreementLinesReplacePayload(input: {
  lines: FinancialAgreementLine[];
  excludeLineId?: number;
  updateLine?: { id: number; patch: Partial<AgreementLinePatchInput> & { reason?: string } };
  appendLine?: AgreementLinePatchInput & { reason?: string };
}): { lines: Array<(AgreementLinePatchInput & { id?: number; reason?: string })> } {
  let serialized: Array<AgreementLinePatchInput & { id?: number; reason?: string }> = input.lines
    .filter((line) => line.id != null && line.service_id != null)
    .filter((line) => input.excludeLineId == null || line.id !== input.excludeLineId)
    .map((line) => {
      const base = serializeAgreementLineForPatch(line);
      if (input.updateLine && line.id === input.updateLine.id) {
        const { reason, ...patch } = input.updateLine.patch;
        return { ...base, ...patch, ...(reason ? { reason } : {}) };
      }
      return base;
    });

  if (input.appendLine) {
    const { reason, ...line } = input.appendLine;
    serialized = [...serialized, { ...line, ...(reason ? { reason } : {}) }];
  }

  return { lines: serialized };
}
