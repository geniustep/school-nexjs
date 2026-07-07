import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  BillingAuthorityChangeBootstrap,
  BillingAuthorityMessage,
  BillingAuthorityPartyType,
  BillingAuthorityRef,
  BillingAuthorityTarget,
  NormalizedBillingAuthorityChangePreview,
} from '@/types/finance-billing-authority-change';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(obj: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (val && typeof val === 'object' && 'name' in (val as object)) {
      const name = (val as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) return name.trim();
    }
  }
  return null;
}

function readNumber(obj: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const val = obj[key];
    const normalized = normalizeMoneyValue(val);
    if (normalized != null) return normalized;
  }
  return null;
}

function readBool(obj: Record<string, unknown> | null, ...keys: string[]): boolean | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === '1' || val === 'true') return true;
    if (val === 0 || val === '0' || val === 'false') return false;
  }
  return undefined;
}

function readPartyType(value: unknown): BillingAuthorityPartyType | null {
  if (value === 'guardian' || value === 'student') return value;
  return null;
}

function readAuthorityRef(raw: unknown): BillingAuthorityRef {
  const rec = asRecord(raw);
  if (!rec) return {};
  return {
    billing_party_type: readPartyType(rec.billing_party_type ?? rec.party_type ?? rec.type),
    name:
      readString(rec, 'name', 'label', 'display_name', 'billing_partner_name') ??
      readString(asRecord(rec.billing_partner), 'name', 'label'),
    guardian_id: readNumber(rec, 'guardian_id') ?? undefined,
    billing_partner_id:
      readNumber(rec, 'billing_partner_id', 'partner_id') ??
      readNumber(asRecord(rec.billing_partner), 'id'),
  };
}

function readMessages(raw: unknown): BillingAuthorityMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: BillingAuthorityMessage[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      messages.push({ message: item.trim(), code: item.trim() });
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    const message =
      readString(rec, 'message', 'label', 'detail', 'description') ?? readString(rec, 'code');
    if (!message) continue;
    messages.push({
      code: readString(rec, 'code'),
      message,
    });
  }
  return messages;
}

function readTarget(raw: unknown): BillingAuthorityTarget | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const billing_party_type = readPartyType(
    rec.billing_party_type ?? rec.party_type ?? rec.type ?? rec.target_type,
  );
  if (!billing_party_type) return null;
  const label =
    readString(rec, 'label', 'name', 'display_name', 'billing_partner_name') ??
    (billing_party_type === 'student' ? 'student' : 'guardian');
  return {
    billing_party_type,
    guardian_id: readNumber(rec, 'guardian_id'),
    billing_partner_id: readNumber(rec, 'billing_partner_id', 'partner_id'),
    label,
    is_current: readBool(rec, 'is_current', 'current') === true,
    is_self: readBool(rec, 'is_self', 'self_billing') === true || billing_party_type === 'student',
  };
}

function readTargets(raw: unknown): BillingAuthorityTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => readTarget(item))
    .filter((item): item is BillingAuthorityTarget => item != null);
}

function readNarrativeLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : readString(asRecord(item), 'message')))
    .filter((item): item is string => !!item);
}

export function normalizeBillingAuthorityChangeBootstrap(raw: unknown): BillingAuthorityChangeBootstrap {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? root;
  const currentAuthority =
    readAuthorityRef(
      data.current_authority ??
        data.current ??
        data.current_billing_authority ??
        data.billing_authority,
    ) ?? {};
  const eligibleTargets = readTargets(
    data.eligible_targets ??
      data.eligible_guardians ??
      data.targets ??
      data.options ??
      data.eligible_billing_partners,
  );
  return { currentAuthority, eligibleTargets };
}

export function normalizeBillingAuthorityChangePreview(
  raw: unknown,
): NormalizedBillingAuthorityChangePreview {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? asRecord(root.preview) ?? root;
  const impact =
    asRecord(data.financial_impact) ??
    asRecord(data.impact) ??
    asRecord(data.amounts) ??
    data;
  const currentAuthority =
    readAuthorityRef(
      data.current_authority ??
        data.current ??
        data.current_billing_authority ??
        data.from_authority,
    ) ?? {};
  const newAuthority =
    readAuthorityRef(
      data.new_authority ?? data.new ?? data.to_authority ?? data.target_authority,
    ) ?? {};
  const amountSplit =
    readNumber(impact, 'amount_split_successor', 'split_successor_amount', 'amount_needing_split') ??
    null;
  const financialImpact = {
    amount_preserved_paid:
      readNumber(
        impact,
        'amount_preserved_paid',
        'preserved_paid_amount',
        'paid_amount_preserved',
        'amount_preserved',
      ) ?? null,
    amount_transfer_full:
      readNumber(
        impact,
        'amount_transfer_full',
        'full_transfer_amount',
        'amount_movable',
        'unpaid_amount_transferring',
      ) ?? null,
    amount_split_successor: amountSplit,
    has_split:
      readBool(impact, 'has_split', 'requires_split_successor') === true ||
      (amountSplit != null && amountSplit > 0),
  };
  const canApply =
    readBool(data, 'can_apply', 'applicable') ??
    readBool(root, 'can_apply', 'applicable') ??
    false;
  return {
    currentAuthority,
    newAuthority,
    financialImpact,
    affectedAgreementsCount:
      readNumber(data, 'affected_agreements_count', 'agreements_affected_count') ?? 0,
    warnings: readMessages(data.warnings ?? root.warnings),
    blockers: readMessages(data.blockers ?? root.blockers),
    canApply: canApply === true,
    previewToken:
      readString(data, 'preview_token') ?? readString(root, 'preview_token'),
    currency:
      readString(data, 'currency') ??
      readString(asRecord(data.currency), 'name') ??
      readString(impact, 'currency'),
    eligibleTargets: readTargets(
      data.eligible_targets ?? data.eligible_guardians ?? data.targets ?? data.options,
    ),
    narrativeLines: readNarrativeLines(
      data.narrative_lines ?? data.display_messages ?? data.messages ?? data.summary_lines,
    ),
  };
}
