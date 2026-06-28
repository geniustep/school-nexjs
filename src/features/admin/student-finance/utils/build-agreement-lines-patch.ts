import type {
  FinanceServiceCatalogItem,
  FinanceServiceTariff,
  FinancialAgreementLine,
  UpdateFinancialAgreementPayload,
} from '../types';
import { isOneTimeAgreementLine } from './agreement-amendment-line-eligibility';

export type AgreementLineReasonMode = 'add' | 'edit' | 'delete';

export type AgreementLineReasonContext = {
  mode: AgreementLineReasonMode;
  discountType: string;
  discountValue?: number;
  unitPrice?: number;
  defaultPrice?: number | null;
};

export type AgreementLineReasonKind = 'optional' | 'discount' | 'special_price' | 'delete';

/** Pricing/recurrence fields copied from Odoo tariff or agreement line responses. */
export const AGREEMENT_LINE_TARIFF_METADATA_KEYS = [
  'commitment_type',
  'pricing_unit',
  'charge_generation_mode',
] as const;

/** Minimum metadata Odoo requires when creating a new agreement line. */
export const AGREEMENT_LINE_ADD_REQUIRED_METADATA_KEYS = [
  'commitment_type',
  'pricing_unit',
] as const;

/** Metadata fields copied from Odoo agreement line responses — never invented locally. */
export const AGREEMENT_LINE_METADATA_KEYS = [
  'fee_plan_line_id',
  'commitment_type',
  'pricing_unit',
  'charge_generation_mode',
  'service_from',
  'service_until',
  'period_start',
  'period_end',
] as const;

/** Fields that must never be sent as null when patching an existing line. */
export const AGREEMENT_LINE_PROTECTED_KEYS = [
  'fee_plan_line_id',
  'quantity',
  'commitment_type',
  'pricing_unit',
  'charge_generation_mode',
  'service_from',
  'service_until',
  'period_start',
  'period_end',
] as const;

export type AgreementLinePatchOperation = 'discount' | 'edit' | 'add' | 'delete' | 'full_replace';

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

function lineRecord(line: FinancialAgreementLine): Record<string, unknown> {
  return line as Record<string, unknown>;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickMetadataKeys(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  }
  return out;
}

/** Copy pricing/recurrence metadata from a service tariff — never null placeholders. */
export function pickTariffMetadata(tariff: FinanceServiceTariff | null | undefined): Record<string, unknown> {
  if (!tariff) return {};
  return pickMetadataKeys(readRecord(tariff), AGREEMENT_LINE_TARIFF_METADATA_KEYS);
}

/** Copy pricing/recurrence metadata from a service catalog row when Odoo provides it. */
export function pickServiceCatalogMetadata(
  service: FinanceServiceCatalogItem | null | undefined,
): Record<string, unknown> {
  if (!service) return {};
  return pickMetadataKeys(readRecord(service), AGREEMENT_LINE_TARIFF_METADATA_KEYS);
}

export function pickExistingLineMetadataForService(
  existingLines: FinancialAgreementLine[],
  serviceId: number,
): Record<string, unknown> {
  const match = existingLines.find((line) => line.service_id === serviceId);
  return match ? pickAgreementLineMetadata(match) : {};
}

/** Resolve add-line metadata from Odoo-provided catalog sources only — never inferred locally. */
export type AgreementLineManualBillingMode = 'monthly' | 'one_time';

/** Explicit user billing choices mapped to Odoo enum values used in existing agreement lines. */
export const MANUAL_AGREEMENT_LINE_BILLING_METADATA: Record<
  AgreementLineManualBillingMode,
  Record<string, string>
> = {
  monthly: {
    commitment_type: 'recurring',
    pricing_unit: 'month',
    charge_generation_mode: 'monthly',
  },
  one_time: {
    commitment_type: 'one_time',
    pricing_unit: 'academic_year',
    charge_generation_mode: 'one_time',
  },
};

export function buildManualAgreementLineBillingMetadata(
  mode: AgreementLineManualBillingMode,
): Record<string, unknown> {
  return { ...MANUAL_AGREEMENT_LINE_BILLING_METADATA[mode] };
}

export function isAgreementLineManualBillingMode(value: string): value is AgreementLineManualBillingMode {
  return value === 'monthly' || value === 'one_time';
}

export function resolveAgreementLineAddMetadata(input: {
  serviceId: number;
  selectedTariff?: FinanceServiceTariff | null;
  service?: FinanceServiceCatalogItem | null;
  existingLines?: FinancialAgreementLine[];
}): Record<string, unknown> {
  if (input.selectedTariff) {
    const fromTariff = pickTariffMetadata(input.selectedTariff);
    if (Object.keys(fromTariff).length > 0) return fromTariff;
  }

  const fromExisting = pickExistingLineMetadataForService(input.existingLines ?? [], input.serviceId);
  if (Object.keys(fromExisting).length > 0) {
    return pickMetadataKeys(fromExisting, AGREEMENT_LINE_TARIFF_METADATA_KEYS);
  }

  return pickServiceCatalogMetadata(input.service);
}

/** True when add-line flow needs an explicit billing mode because Odoo metadata is incomplete. */
export function needsAgreementLineManualBillingMode(input: {
  serviceId: number;
  selectedTariff?: FinanceServiceTariff | null;
  service?: FinanceServiceCatalogItem | null;
  existingLines?: FinancialAgreementLine[];
}): boolean {
  if (
    input.selectedTariff &&
    hasAgreementLinePricingRecurrenceMetadata(pickTariffMetadata(input.selectedTariff))
  ) {
    return false;
  }
  const metadata = resolveAgreementLineAddMetadata(input);
  return !hasAgreementLinePricingRecurrenceMetadata(metadata);
}

export function hasAgreementLinePricingRecurrenceMetadata(record: Record<string, unknown>): boolean {
  return AGREEMENT_LINE_ADD_REQUIRED_METADATA_KEYS.every((key) => {
    const value = record[key];
    return value !== undefined && value !== null && value !== '';
  });
}

export function resolveAgreementLineAddQuantity(
  quantity: number,
  metadata: Record<string, unknown>,
): number {
  if (isOneTimeAgreementLine(metadata)) return 1;
  return quantity > 0 ? quantity : 1;
}

export function buildAgreementLineAddInput(input: {
  service_id: number;
  tariff_id?: number | null;
  quantity: number;
  unit_price?: number;
  discount_type?: string | null;
  discount_value?: number | null;
  is_selected?: boolean;
  reason?: string;
  selectedTariff?: FinanceServiceTariff | null;
  service?: FinanceServiceCatalogItem | null;
  existingLines?: FinancialAgreementLine[];
  manualBillingMode?: AgreementLineManualBillingMode;
}): AgreementLinePatchInput & { reason?: string } & Record<string, unknown> {
  let metadata = resolveAgreementLineAddMetadata({
    serviceId: input.service_id,
    selectedTariff: input.selectedTariff,
    service: input.service,
    existingLines: input.existingLines,
  });
  if (!hasAgreementLinePricingRecurrenceMetadata(metadata) && input.manualBillingMode) {
    metadata = {
      ...metadata,
      ...buildManualAgreementLineBillingMetadata(input.manualBillingMode),
    };
  }
  const quantity = resolveAgreementLineAddQuantity(input.quantity, metadata);
  const row: Record<string, unknown> = {
    service_id: input.service_id,
    quantity,
    unit_price: input.unit_price,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    is_selected: input.is_selected ?? true,
    ...metadata,
  };
  if (input.tariff_id != null) row.tariff_id = input.tariff_id;
  if (input.reason?.trim()) row.reason = input.reason.trim();
  return omitNullishFields(row) as AgreementLinePatchInput & { reason?: string } & Record<string, unknown>;
}

export function validateAgreementLineAddInput(input: {
  service_id: number;
  selectedTariff?: FinanceServiceTariff | null;
  service?: FinanceServiceCatalogItem | null;
  existingLines?: FinancialAgreementLine[];
  manualBillingMode?: AgreementLineManualBillingMode;
}): { ok: true } | { ok: false; reason: string } {
  const metadata = resolveAgreementLineAddMetadata({
    serviceId: input.service_id,
    selectedTariff: input.selectedTariff,
    service: input.service,
    existingLines: input.existingLines,
  });
  if (hasAgreementLinePricingRecurrenceMetadata(metadata)) return { ok: true };
  if (input.manualBillingMode) return { ok: true };
  if (input.selectedTariff) {
    return { ok: false, reason: 'missing_pricing_recurrence_metadata' };
  }
  return { ok: false, reason: 'billing_mode_required' };
}

const AGREEMENT_LINE_PRICING_RECURRENCE_ODOO_PATTERNS = [
  'cannot create agreement line without required pricing and recurrence metadata',
  'pricing and recurrence metadata',
] as const;

export function isAgreementLinePricingRecurrenceOdooError(message: string): boolean {
  const lower = message.toLowerCase();
  return AGREEMENT_LINE_PRICING_RECURRENCE_ODOO_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function logAgreementLineAddApiError(message: string): void {
  if (typeof console !== 'undefined' && console.error) {
    console.error('[agreement-line-add] Odoo rejected add line:', message);
  }
}

/** Copy metadata from Odoo response only when present — never null placeholders. */
export function pickAgreementLineMetadata(line: FinancialAgreementLine): Record<string, unknown> {
  const source = lineRecord(line);
  const out: Record<string, unknown> = {};
  for (const key of AGREEMENT_LINE_METADATA_KEYS) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

export function omitNullishFields<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out as Partial<T>;
}

export function serializeAgreementLineForPatch(
  line: FinancialAgreementLine,
): AgreementLinePatchInput & { id: number } & Record<string, unknown> {
  const discountType = line.discount_type ?? 'none';
  const discountValue = line.discount_value ?? line.discount_amount ?? 0;

  const row: Record<string, unknown> = {
    id: line.id!,
    service_id: line.service_id!,
    discount_type: discountType,
    discount_value: discountValue,
    ...pickAgreementLineMetadata(line),
  };

  if (line.tariff_id != null) row.tariff_id = line.tariff_id;
  if (line.quantity != null) row.quantity = line.quantity;
  if (line.unit_price != null) row.unit_price = line.unit_price;
  if (line.is_selected != null) row.is_selected = line.is_selected;

  return row as AgreementLinePatchInput & { id: number } & Record<string, unknown>;
}

/** Partial PATCH: discount fields only — does not touch billing metadata. */
export function buildAgreementLineDiscountPatchPayload(input: {
  lineId: number;
  discountType: string;
  discountValue: number;
  reason?: string;
}): UpdateFinancialAgreementPayload {
  const line: Record<string, unknown> = { id: input.lineId };
  if (input.discountType === 'none') {
    line.discount_type = 'none';
    line.discount_value = 0;
  } else {
    line.discount_type = input.discountType;
    line.discount_value = input.discountValue;
  }
  if (input.reason?.trim()) {
    line.reason = input.reason.trim();
  }
  return { lines: [omitNullishFields(line)] };
}

/** Explicit delete via line_ids_to_delete — no accidental omission from lines array. */
export function buildAgreementLineDeletePayload(lineId: number): UpdateFinancialAgreementPayload {
  return { line_ids_to_delete: [lineId] };
}

/** Append a single new line without replacing existing lines. */
export function buildAgreementLineAddPayload(
  appendLine: AgreementLinePatchInput & { reason?: string },
): UpdateFinancialAgreementPayload {
  const { reason, ...line } = appendLine;
  const row: Record<string, unknown> = { ...omitNullishFields(line as Record<string, unknown>) };
  if (reason?.trim()) row.reason = reason.trim();
  return { lines: [row] };
}

export function buildAgreementLinesReplacePayload(input: {
  lines: FinancialAgreementLine[];
  excludeLineId?: number;
  updateLine?: { id: number; patch: Partial<AgreementLinePatchInput> & { reason?: string } };
  appendLine?: AgreementLinePatchInput & { reason?: string };
}): UpdateFinancialAgreementPayload {
  let serialized: Array<AgreementLinePatchInput & { id?: number; reason?: string } & Record<string, unknown>> =
    input.lines
      .filter((line) => line.id != null && line.service_id != null)
      .filter((line) => input.excludeLineId == null || line.id !== input.excludeLineId)
      .map((line) => {
        const base = serializeAgreementLineForPatch(line);
        if (input.updateLine && line.id === input.updateLine.id) {
          const { reason, ...patch } = input.updateLine.patch;
          return omitNullishFields({
            ...base,
            ...patch,
            ...(reason ? { reason } : {}),
          }) as AgreementLinePatchInput & { id?: number; reason?: string };
        }
        return base;
      });

  if (input.appendLine) {
    const { reason, ...line } = input.appendLine;
    serialized = [
      ...serialized,
      omitNullishFields({
        ...line,
        ...(reason ? { reason } : {}),
      }) as AgreementLinePatchInput & { reason?: string },
    ];
  }

  return { lines: serialized as UpdateFinancialAgreementPayload['lines'] };
}

function findProtectedKeyViolations(
  patchRow: Record<string, unknown>,
  sourceLine?: FinancialAgreementLine,
): string[] {
  const violations: string[] = [];
  for (const key of AGREEMENT_LINE_PROTECTED_KEYS) {
    if (patchRow[key] === null) {
      violations.push(`${key}:null`);
      continue;
    }
    if (sourceLine == null) continue;
    const sourceValue = lineRecord(sourceLine)[key];
    if (sourceValue == null) continue;
    if (!(key in patchRow)) continue;
    if (patchRow[key] === undefined) continue;
    if (patchRow[key] !== sourceValue && key !== 'quantity') {
      // quantity may legitimately change on add flow; full-replace must match source unless explicitly patched
    }
  }

  if (sourceLine?.id != null) {
    for (const key of AGREEMENT_LINE_PROTECTED_KEYS) {
      const sourceValue = lineRecord(sourceLine)[key];
      if (sourceValue == null) continue;
      if (key in patchRow && patchRow[key] === null) {
        violations.push(`${key}:null`);
      }
    }
    const sourceQty = sourceLine.quantity;
    if (sourceQty != null && sourceQty !== 1) {
      if ('quantity' in patchRow && patchRow.quantity === 1 && sourceQty !== 1) {
        violations.push('quantity:defaulted_to_1');
      }
      if ('quantity' in patchRow && patchRow.quantity == null) {
        violations.push('quantity:null');
      }
    }
    const sourceFeePlan = lineRecord(sourceLine).fee_plan_line_id;
    if (sourceFeePlan != null && ('fee_plan_line_id' in patchRow) && patchRow.fee_plan_line_id == null) {
      violations.push('fee_plan_line_id:missing');
    }
  }

  return violations;
}

/**
 * Blocks PATCH payloads that would strip billing metadata from existing lines.
 * Logs technical detail to console; callers should show a user-safe message.
 */
export function validateAgreementLinePatchSafety(input: {
  operation: AgreementLinePatchOperation;
  sourceLines: FinancialAgreementLine[];
  payload: UpdateFinancialAgreementPayload;
  targetLineId?: number;
}): { ok: true } | { ok: false; reason: string; detail: string } {
  const { operation, sourceLines, payload, targetLineId } = input;

  if (operation === 'delete') {
    const ids = payload.line_ids_to_delete ?? [];
    if (ids.length !== 1 || targetLineId == null || ids[0] !== targetLineId) {
      return {
        ok: false,
        reason: 'line_patch_unsafe',
        detail: `delete payload must use line_ids_to_delete=[${targetLineId}]`,
      };
    }
    if (!sourceLines.some((line) => line.id === targetLineId)) {
      return { ok: false, reason: 'missing_target', detail: 'delete target not in source lines' };
    }
    return { ok: true };
  }

  const patchLines = payload.lines ?? [];
  if (patchLines.length === 0) {
    return { ok: false, reason: 'line_patch_unsafe', detail: 'empty lines array' };
  }

  if (operation === 'discount') {
    if (patchLines.length !== 1) {
      return {
        ok: false,
        reason: 'line_patch_unsafe',
        detail: `discount patch must send exactly one line, got ${patchLines.length}`,
      };
    }
    const row = patchLines[0] as Record<string, unknown>;
    if (row.id == null) {
      return { ok: false, reason: 'line_patch_unsafe', detail: 'discount patch missing line id' };
    }
    if (targetLineId != null && row.id !== targetLineId) {
      return { ok: false, reason: 'missing_target', detail: 'discount patch id mismatch' };
    }
    const forbiddenKeys = [
      'quantity',
      'fee_plan_line_id',
      'commitment_type',
      'pricing_unit',
      'charge_generation_mode',
      'service_from',
      'service_until',
      'period_start',
      'period_end',
    ];
    for (const key of forbiddenKeys) {
      if (key in row) {
        return {
          ok: false,
          reason: 'line_patch_unsafe',
          detail: `discount patch must not include ${key}`,
        };
      }
    }
    const violations = findProtectedKeyViolations(row, sourceLines.find((l) => l.id === row.id));
    if (violations.length > 0) {
      return {
        ok: false,
        reason: 'line_metadata_stripped',
        detail: violations.join(', '),
      };
    }
    return { ok: true };
  }

  if (operation === 'edit') {
    if (patchLines.length !== 1) {
      return {
        ok: false,
        reason: 'line_patch_unsafe',
        detail: `edit patch must send exactly one line, got ${patchLines.length}`,
      };
    }
    const row = patchLines[0] as Record<string, unknown>;
    if (row.id == null) {
      return { ok: false, reason: 'line_patch_unsafe', detail: 'edit patch missing line id' };
    }
    if (targetLineId != null && row.id !== targetLineId) {
      return { ok: false, reason: 'missing_target', detail: 'edit patch id mismatch' };
    }
    const forbiddenKeys = [
      'fee_plan_line_id',
      'commitment_type',
      'pricing_unit',
      'charge_generation_mode',
      'service_from',
      'service_until',
      'period_start',
      'period_end',
      'service_id',
      'tariff_id',
      'unit_price',
    ];
    for (const key of forbiddenKeys) {
      if (key in row) {
        return {
          ok: false,
          reason: 'line_patch_unsafe',
          detail: `edit patch must not include ${key}`,
        };
      }
    }
    const hasQuantityField = 'quantity' in row || 'periods_count' in row;
    const hasDiscountField = 'discount_type' in row || 'discount_value' in row;
    if (!hasQuantityField && !hasDiscountField) {
      return {
        ok: false,
        reason: 'line_patch_unsafe',
        detail: 'edit patch must include quantity or discount fields',
      };
    }
    return { ok: true };
  }

  if (operation === 'add') {
    for (const patchLine of patchLines) {
      const row = patchLine as Record<string, unknown>;
      if (row.id != null) {
        return { ok: false, reason: 'line_patch_unsafe', detail: 'add patch must not include line id' };
      }
      const violations = findProtectedKeyViolations(row);
      if (violations.length > 0) {
        return { ok: false, reason: 'line_metadata_stripped', detail: violations.join(', ') };
      }
    }
    return { ok: true };
  }

  // full_replace — each existing line must preserve metadata present in source
  for (const patchLine of patchLines) {
    const row = patchLine as Record<string, unknown>;
    if (row.id == null) continue;
    const source = sourceLines.find((line) => line.id === row.id);
    const violations = findProtectedKeyViolations(row, source);
    if (violations.length > 0) {
      return {
        ok: false,
        reason: 'line_metadata_stripped',
        detail: `line ${row.id}: ${violations.join(', ')}`,
      };
    }
    if (source) {
      for (const key of AGREEMENT_LINE_METADATA_KEYS) {
        const sourceValue = lineRecord(source)[key];
        if (sourceValue == null) continue;
        if (!(key in row)) {
          return {
            ok: false,
            reason: 'line_metadata_stripped',
            detail: `line ${row.id}: missing preserved ${key}`,
          };
        }
      }
    }
  }

  return { ok: true };
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

export function validateAgreementLineEditPatch(input: {
  sourceLines: FinancialAgreementLine[];
  lineId: number;
  payload: UpdateFinancialAgreementPayload;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.sourceLines.some((line) => line.id === input.lineId)) {
    return { ok: false, reason: 'missing_target' };
  }
  const safety = validateAgreementLinePatchSafety({
    operation: 'edit',
    sourceLines: input.sourceLines,
    payload: input.payload,
    targetLineId: input.lineId,
  });
  if (!safety.ok) return { ok: false, reason: safety.reason };
  return { ok: true };
}

export function validateAgreementLineDiscountPatch(input: {
  sourceLines: FinancialAgreementLine[];
  lineId: number;
  payload: UpdateFinancialAgreementPayload;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.sourceLines.some((line) => line.id === input.lineId)) {
    return { ok: false, reason: 'missing_target' };
  }
  const safety = validateAgreementLinePatchSafety({
    operation: 'discount',
    sourceLines: input.sourceLines,
    payload: input.payload,
    targetLineId: input.lineId,
  });
  if (!safety.ok) return { ok: false, reason: safety.reason };
  return { ok: true };
}

export function validateAgreementLineDeletePatch(input: {
  sourceLines: FinancialAgreementLine[];
  lineId: number;
  payload: UpdateFinancialAgreementPayload;
}): { ok: true } | { ok: false; reason: string } {
  if (input.sourceLines.length === 0) {
    return { ok: false, reason: 'empty_source' };
  }
  const safety = validateAgreementLinePatchSafety({
    operation: 'delete',
    sourceLines: input.sourceLines,
    payload: input.payload,
    targetLineId: input.lineId,
  });
  if (!safety.ok) return { ok: false, reason: safety.reason };
  return { ok: true };
}

export function validateAgreementLineAddPatch(input: {
  payload: UpdateFinancialAgreementPayload;
}): { ok: true } | { ok: false; reason: string } {
  const safety = validateAgreementLinePatchSafety({
    operation: 'add',
    sourceLines: [],
    payload: input.payload,
  });
  if (!safety.ok) return { ok: false, reason: safety.reason };

  for (const patchLine of input.payload.lines ?? []) {
    const row = patchLine as Record<string, unknown>;
    if (row.id != null) continue;
    if (!hasAgreementLinePricingRecurrenceMetadata(row)) {
      return { ok: false, reason: 'billing_mode_required' };
    }
  }
  return { ok: true };
}

export function logAgreementLinePatchBlocked(detail: string): void {
  if (typeof console !== 'undefined' && console.error) {
    console.error('[agreement-line-patch] blocked unsafe payload:', detail);
  }
}
