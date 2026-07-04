import type { StudentFinanceWorkspace } from '../types';
import type {
  BillingPartnerMismatchDetail,
  FinanceReviewBillingPartnerPresentation,
  FinanceReviewPresentation,
} from '../types/finance-review';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBool(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function readPartnerName(value: unknown): string | null {
  const rec = asRecord(value);
  if (!rec) return null;
  return readString(rec.name) ?? readString(rec.display_name);
}

export function readFinanceReviewReasons(
  workspace?: StudentFinanceWorkspace | null,
): string[] {
  const raw = workspace as StudentFinanceWorkspace & { finance_review_reasons?: unknown };
  const reasons = raw?.finance_review_reasons;
  if (!Array.isArray(reasons)) return [];
  return reasons
    .map((item) => (typeof item === 'string' ? item.trim() : readString(asRecord(item)?.code)))
    .filter((item): item is string => Boolean(item));
}

function normalizeBillingPartnerMismatchDetail(
  raw: unknown,
): BillingPartnerMismatchDetail | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const code = readString(rec.code);
  if (code !== 'billing_partner_mismatch') return null;
  return {
    code: 'billing_partner_mismatch',
    agreement_id: readFiniteNumber(rec.agreement_id) ?? undefined,
    agreement_partner: (asRecord(rec.agreement_partner) as BillingPartnerMismatchDetail['agreement_partner']) ?? null,
    profile_partner: (asRecord(rec.profile_partner) as BillingPartnerMismatchDetail['profile_partner']) ?? null,
    finance_profile_id: readFiniteNumber(rec.finance_profile_id) ?? undefined,
    resolution_available: readBool(rec.resolution_available) ?? undefined,
    resolution_strategy: readString(rec.resolution_strategy),
    resolution_block_reason: readString(rec.resolution_block_reason),
    resolution_message: readString(rec.resolution_message),
  };
}

export function readBillingPartnerMismatchDetail(
  workspace?: StudentFinanceWorkspace | null,
): BillingPartnerMismatchDetail | null {
  const raw = workspace as StudentFinanceWorkspace & { finance_review_details?: unknown };
  const details = raw?.finance_review_details;
  if (!details) return null;

  if (Array.isArray(details)) {
    for (const item of details) {
      const normalized = normalizeBillingPartnerMismatchDetail(item);
      if (normalized) return normalized;
    }
    return null;
  }

  const record = asRecord(details);
  if (!record) return null;

  const direct =
    normalizeBillingPartnerMismatchDetail(record.billing_partner_mismatch) ??
    normalizeBillingPartnerMismatchDetail(record);
  return direct;
}

function buildBillingPartnerPresentation(
  detail: BillingPartnerMismatchDetail | null,
): FinanceReviewBillingPartnerPresentation | null {
  if (!detail) return null;
  return {
    agreementPartnerName: readPartnerName(detail.agreement_partner),
    profilePartnerName: readPartnerName(detail.profile_partner),
    resolutionAvailable: detail.resolution_available === true,
    resolutionBlockReason: detail.resolution_block_reason ?? null,
    resolutionMessage: detail.resolution_message ?? null,
    resolutionStrategy: detail.resolution_strategy ?? null,
    agreementId: detail.agreement_id ?? null,
  };
}

export function resolveFinanceReviewPresentation(
  workspace?: StudentFinanceWorkspace | null,
): FinanceReviewPresentation {
  const requiresReview = readRequiresFinanceReview(workspace);
  const reasons = readFinanceReviewReasons(workspace);
  const hasBillingPartnerMismatch = reasons.includes('billing_partner_mismatch');
  const detail = hasBillingPartnerMismatch ? readBillingPartnerMismatchDetail(workspace) : null;
  const billingPartnerMismatch = buildBillingPartnerPresentation(detail);

  return {
    visible: requiresReview && hasBillingPartnerMismatch && billingPartnerMismatch != null,
    hasBillingPartnerMismatch,
    billingPartnerMismatch,
  };
}
