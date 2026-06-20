import type { NormalizedChangePlanPreview } from '@/types/student-finance-change-plan';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(obj: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val;
    if (val && typeof val === 'object' && 'name' in (val as object)) {
      const name = (val as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) return name;
    }
  }
  return null;
}

function readNumber(obj: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && Number.isFinite(val)) return val;
  }
  return null;
}

function readBool(obj: Record<string, unknown> | null, ...keys: string[]): boolean | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'boolean') return val;
  }
  return undefined;
}

function readStringArray(obj: Record<string, unknown> | null, ...keys: string[]): string[] {
  if (!obj) return [];
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

export function normalizeChangePlanPreview(raw: unknown): NormalizedChangePlanPreview {
  const root = asRecord(raw) ?? {};
  const preview = asRecord(root.preview) ?? root;
  const impact = asRecord(preview.impact) ?? asRecord(root.impact) ?? preview;
  const current = asRecord(preview.current) ?? asRecord(root.current) ?? {};
  const next = asRecord(preview.proposed) ?? asRecord(preview.new) ?? asRecord(root.proposed) ?? {};

  const blockingReasons = [
    ...readStringArray(preview, 'blocking_reasons', 'blockers'),
    ...readStringArray(root, 'blocking_reasons', 'blockers'),
  ];
  const warnings = [
    ...readStringArray(preview, 'warnings'),
    ...readStringArray(root, 'warnings'),
  ];

  const canApply =
    readBool(preview, 'can_apply', 'applicable') ??
    readBool(root, 'can_apply', 'applicable') ??
    blockingReasons.length === 0;

  return {
    canApply,
    blockingReasons,
    warnings,
    currentAgreementLabel: readString(current, 'agreement', 'agreement_name', 'agreement_label'),
    currentFeePlanLabel: readString(current, 'fee_plan', 'fee_plan_name', 'current_fee_plan'),
    newFeePlanLabel: readString(next, 'fee_plan', 'fee_plan_name', 'new_fee_plan'),
    willAmendCurrent:
      readBool(impact, 'will_amend_current', 'amend_current_agreement') ??
      readBool(preview, 'will_amend_current', 'amend_current_agreement'),
    willCreateNew:
      readBool(impact, 'will_create_new', 'create_new_agreement') ??
      readBool(preview, 'will_create_new', 'create_new_agreement'),
    newAgreementStateLabel: readString(next, 'agreement_state', 'activation_mode', 'state'),
    preservedPeriods: readStringArray(impact, 'preserved_periods', 'unchanged_periods'),
    affectedPeriods: readStringArray(impact, 'affected_periods', 'future_periods'),
    oldAmount: readNumber(impact, 'old_amount', 'previous_amount', 'amount_before'),
    newAmount: readNumber(impact, 'new_amount', 'amount_after'),
    discountAmount: readNumber(impact, 'discount_amount', 'discount_value', 'total_discount'),
    currency: readString(impact, 'currency', 'currency_code'),
  };
}
