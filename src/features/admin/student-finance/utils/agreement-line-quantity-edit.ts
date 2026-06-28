import type { TranslateFn } from '@/features/i18n/locale-context';
import type { UpdateFinancialAgreementPayload } from '../types';
import type {
  AgreementLineEditFormInput,
  AgreementLineEditPreviewSnapshot,
} from '../types/agreement-line-edit';
import type {
  AgreementLineQuantityEditContract,
  AgreementLineQuantitySemantics,
  FinancialAgreementLine,
} from '../types';
import { omitNullishFields } from './build-agreement-lines-patch';

export function resolveAgreementLineQuantitySemantics(
  line: FinancialAgreementLine | null | undefined,
): AgreementLineQuantitySemantics | undefined {
  return line?.quantity_edit_contract?.quantity_semantics;
}

export function resolveAgreementLineEditableQuantity(
  line: FinancialAgreementLine | null | undefined,
): number {
  if (!line) return 1;
  const contract = line.quantity_edit_contract;
  if (contract?.current_quantity != null && contract.current_quantity > 0) {
    return contract.current_quantity;
  }
  if (line.periods_count != null && line.periods_count > 0) return line.periods_count;
  if (line.quantity != null && line.quantity > 0) return line.quantity;
  return 1;
}

export function resolveAgreementLineMaxQuantity(
  line: FinancialAgreementLine | null | undefined,
): number | null {
  const max = line?.quantity_edit_contract?.max_quantity;
  if (max == null || !Number.isFinite(max) || max < 1) return null;
  return max;
}

export function isAgreementLineQuantityEditable(
  line: FinancialAgreementLine | null | undefined,
): boolean {
  const contract = line?.quantity_edit_contract;
  if (contract?.quantity_allowed === false) return false;
  if (contract?.quantity_semantics === 'fixed_one_time') return false;
  const max = resolveAgreementLineMaxQuantity(line);
  if (max == null) return false;
  return contract?.quantity_allowed === true;
}

export function resolveAgreementLineQuantityFieldKey(
  semantics: AgreementLineQuantitySemantics | undefined,
): 'periods_count' | 'quantity' {
  return semantics === 'item_count' ? 'quantity' : 'periods_count';
}

export function formatAgreementLineQuantityDisplay(
  t: TranslateFn,
  line: FinancialAgreementLine,
): string {
  const semantics = resolveAgreementLineQuantitySemantics(line);
  if (semantics === 'fixed_one_time') {
    return t('admin.student360.financialAgreement.customization.quantityDisplay.oneTime');
  }
  const value = resolveAgreementLineEditableQuantity(line);
  if (semantics === 'item_count') {
    return t('admin.student360.financialAgreement.customization.quantityDisplay.itemCount', {
      count: String(value),
    });
  }
  if (semantics === 'period_count' || line.periods_count != null) {
    return t('admin.student360.financialAgreement.customization.quantityDisplay.periodCount', {
      count: String(value),
    });
  }
  if (line.quantity === 1) {
    return t('admin.student360.financialAgreement.customization.quantityDisplay.oneTime');
  }
  return String(line.quantity ?? t('common.dash'));
}

export function resolveAgreementLineQuantityLabelKey(
  semantics: AgreementLineQuantitySemantics | undefined,
): string {
  if (semantics === 'item_count') {
    return 'admin.student360.financialAgreement.customization.fields.quantityLabel';
  }
  return 'admin.student360.financialAgreement.customization.fields.periodCountLabel';
}

export function needsAgreementLinePeriodReductionReason(input: {
  line: FinancialAgreementLine;
  nextQuantity: number;
}): boolean {
  const { line, nextQuantity } = input;
  const current = resolveAgreementLineEditableQuantity(line);
  if (nextQuantity >= current) return false;

  const max = resolveAgreementLineMaxQuantity(line);
  if (max != null && nextQuantity < max) return true;

  const schedulePeriodCount = line.schedule_period_count;
  if (schedulePeriodCount != null && nextQuantity < schedulePeriodCount) return true;

  return false;
}

export function validateAgreementLineQuantityValue(input: {
  line: FinancialAgreementLine;
  value: number;
}): { ok: true } | { ok: false; errorKey: string } {
  const { line, value } = input;
  if (!Number.isFinite(value) || value < 1) {
    return { ok: false, errorKey: 'quantityMin' };
  }
  const max = resolveAgreementLineMaxQuantity(line);
  if (max != null && value > max) {
    return { ok: false, errorKey: 'quantityMax' };
  }
  if (!isAgreementLineQuantityEditable(line) && value !== resolveAgreementLineEditableQuantity(line)) {
    return { ok: false, errorKey: 'quantityNotEditable' };
  }
  return { ok: true };
}

export function buildAgreementLineEditPayload(
  input: AgreementLineEditFormInput,
): UpdateFinancialAgreementPayload {
  const row: Record<string, unknown> = { id: input.lineId };
  const fieldKey = resolveAgreementLineQuantityFieldKey(input.quantitySemantics);
  row[fieldKey] = input.quantityValue;

  if (input.discountType === 'none') {
    row.discount_type = 'none';
    row.discount_value = 0;
  } else {
    row.discount_type = input.discountType;
    row.discount_value = input.discountValue;
  }

  if (input.reason?.trim()) row.reason = input.reason.trim();
  if (input.internalNote?.trim()) row.internal_note = input.internalNote.trim();

  return { lines: [omitNullishFields(row)] };
}

export function hasAgreementLineEditChanges(input: {
  line: FinancialAgreementLine;
  quantityValue: number;
  discountType: string;
  discountValue: number;
  internalNote?: string;
}): boolean {
  const currentQty = resolveAgreementLineEditableQuantity(input.line);
  const lineDiscountType =
    input.line.discount_type === 'none' || !input.line.discount_type ? 'none' : input.line.discount_type;
  const lineDiscountValue = input.line.discount_value ?? input.line.discount_amount ?? 0;
  const normalizedDiscountValue = input.discountType === 'none' ? 0 : input.discountValue;

  return (
    input.quantityValue !== currentQty ||
    input.discountType !== lineDiscountType ||
    normalizedDiscountValue !== lineDiscountValue ||
    (input.internalNote?.trim() ?? '') !== (input.line.internal_note?.trim() ?? '')
  );
}

export function readAgreementLineScheduleTotal(line: FinancialAgreementLine): number | null {
  if (line.schedule_total != null) return line.schedule_total;
  const summary = (line as FinancialAgreementLine & { schedule_summary?: { total_amount?: number } })
    .schedule_summary;
  return summary?.total_amount ?? null;
}

export function buildAgreementLineEditPreviewSnapshot(
  line: FinancialAgreementLine,
): AgreementLineEditPreviewSnapshot {
  return {
    line_id: line.id,
    quantity: line.quantity ?? null,
    periods_count: line.periods_count ?? line.quantity ?? null,
    unit_price: line.unit_price ?? null,
    discount_type: line.discount_type ?? null,
    discount_value: line.discount_value ?? null,
    discount_amount: line.discount_amount ?? null,
    net_amount: line.net_amount ?? null,
    schedule_total: readAgreementLineScheduleTotal(line),
  };
}

export function resolveQuantityEditContractFromLine(
  line: FinancialAgreementLine,
): AgreementLineQuantityEditContract | null {
  return line.quantity_edit_contract ?? null;
}
