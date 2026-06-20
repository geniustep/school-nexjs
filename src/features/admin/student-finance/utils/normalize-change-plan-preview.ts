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

function readReasonCodes(obj: Record<string, unknown> | null, ...keys: string[]): string[] {
  if (!obj) return [];
  for (const key of keys) {
    const val = obj[key];
    if (!Array.isArray(val)) continue;
    const codes: string[] = [];
    for (const item of val) {
      if (typeof item === 'string' && item.trim()) {
        codes.push(item);
        continue;
      }
      const rec = asRecord(item);
      const code = readString(rec, 'code');
      if (code) codes.push(code);
      else {
        const message = readString(rec, 'message');
        if (message) codes.push(message);
      }
    }
    if (codes.length) return codes;
  }
  return [];
}

export function normalizeChangePlanPreview(raw: unknown): NormalizedChangePlanPreview {
  const root = asRecord(raw) ?? {};
  const preview = asRecord(root.preview) ?? root;
  const impact = asRecord(preview.impact) ?? asRecord(root.impact) ?? preview;
  const currentAgreement =
    asRecord(preview.current_agreement) ??
    asRecord(root.current_agreement) ??
    asRecord(preview.current) ??
    asRecord(root.current);
  const current = currentAgreement ?? asRecord(preview.current) ?? asRecord(root.current) ?? {};
  const next =
    asRecord(preview.proposed) ??
    asRecord(preview.new) ??
    asRecord(root.proposed) ??
    asRecord(root.new_agreement) ??
    {};
  const lockedHistory =
    asRecord(preview.locked_history) ?? asRecord(root.locked_history) ?? asRecord(impact.locked_history);
  const affectedFuture =
    asRecord(preview.affected_future_periods) ??
    asRecord(root.affected_future_periods) ??
    asRecord(impact.affected_future_periods);
  const financialImpact =
    asRecord(preview.financial_impact) ??
    asRecord(root.financial_impact) ??
    asRecord(impact.financial_impact) ??
    impact;

  const blockingReasons = [
    ...new Set([
      ...readReasonCodes(preview, 'blocking_reasons', 'blockers'),
      ...readReasonCodes(root, 'blocking_reasons', 'blockers'),
    ]),
  ];
  const warnings = [
    ...new Set([...readReasonCodes(preview, 'warnings'), ...readReasonCodes(root, 'warnings')]),
  ];

  const canApply =
    readBool(preview, 'can_apply', 'applicable') ??
    readBool(root, 'can_apply', 'applicable') ??
    (blockingReasons.length === 0 ? true : false);

  const policy = readString(preview, 'policy') ?? readString(root, 'policy');
  const willAmendFromPolicy = policy ? /amended|amend/i.test(policy) : undefined;
  const willCreateFromPolicy = policy ? /new agreement|created/i.test(policy) : undefined;

  return {
    canApply,
    blockingReasons,
    warnings,
    currentAgreementLabel: readString(current, 'name', 'agreement', 'agreement_name', 'agreement_label'),
    currentFeePlanLabel: readString(current, 'fee_plan_name', 'fee_plan', 'current_fee_plan'),
    newFeePlanLabel: readString(next, 'fee_plan_name', 'fee_plan', 'new_fee_plan'),
    willAmendCurrent:
      readBool(impact, 'will_amend_current', 'amend_current_agreement') ??
      readBool(preview, 'will_amend_current', 'amend_current_agreement') ??
      willAmendFromPolicy,
    willCreateNew:
      readBool(impact, 'will_create_new', 'create_new_agreement') ??
      readBool(preview, 'will_create_new', 'create_new_agreement') ??
      willCreateFromPolicy,
    newAgreementStateLabel: readString(next, 'agreement_state', 'activation_mode', 'state'),
    preservedPeriods: [
      ...readStringArray(lockedHistory, 'paid_periods', 'preserved_periods', 'unchanged_periods'),
      ...readStringArray(impact, 'preserved_periods', 'unchanged_periods'),
    ],
    affectedPeriods: [
      ...readStringArray(affectedFuture, 'periods'),
      ...readStringArray(impact, 'affected_periods', 'future_periods'),
    ],
    oldAmount:
      readNumber(financialImpact, 'old_total_remaining', 'old_amount', 'previous_amount', 'amount_before') ??
      readNumber(affectedFuture, 'old_remaining_total'),
    newAmount:
      readNumber(financialImpact, 'new_total_remaining', 'new_amount', 'amount_after') ??
      readNumber(affectedFuture, 'new_remaining_total'),
    discountAmount:
      readNumber(financialImpact, 'total_discount', 'discount_amount', 'discount_value') ??
      readNumber(affectedFuture, 'discount_impact'),
    currency: readString(financialImpact, 'currency', 'currency_code'),
  };
}
