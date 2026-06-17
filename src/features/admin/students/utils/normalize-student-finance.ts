import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  StudentBillingProfileSummary,
  StudentFinanceCapabilities,
  StudentFinanceConsistency,
  StudentFinanceCurrency,
  StudentFinanceOverviewSummary,
  StudentFinanceSummaryData,
  StudentFinanceSummaryTotals,
  StudentFinancialResponsible,
} from '@/types/student-finance';

const DEFAULT_CAPS: StudentFinanceCapabilities = {
  can_view: false,
  can_view_payments: false,
  can_collect: false,
  can_assign_fees: false,
  can_manage_discounts: false,
  can_approve_discounts: false,
  can_view_billing_profile: false,
  can_manage_billing_profile: false,
};

function normalizeCurrency(value: unknown): StudentFinanceCurrency {
  if (!value || typeof value !== 'object') {
    return { name: 'MAD', symbol: 'DH', position: 'after' };
  }
  const raw = value as Record<string, unknown>;
  return {
    name: typeof raw.name === 'string' ? raw.name : 'MAD',
    symbol: typeof raw.symbol === 'string' ? raw.symbol : raw.name === 'string' ? raw.name : 'DH',
    position: typeof raw.position === 'string' ? raw.position : 'after',
  };
}

function normalizeSummaryTotals(value: unknown): StudentFinanceSummaryTotals {
  const currency = normalizeCurrency(
    value && typeof value === 'object' ? (value as Record<string, unknown>).currency : null,
  );
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    currency,
    total_assessed: normalizeMoneyValue(raw.total_assessed) ?? 0,
    total_discount: normalizeMoneyValue(raw.total_discount) ?? 0,
    total_paid: normalizeMoneyValue(raw.total_paid) ?? 0,
    total_outstanding: normalizeMoneyValue(raw.total_outstanding) ?? 0,
    total_overdue: normalizeMoneyValue(raw.total_overdue) ?? 0,
    next_due_date: typeof raw.next_due_date === 'string' ? raw.next_due_date : null,
  };
}

export function normalizeBillingProfile(value: unknown): StudentBillingProfileSummary | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number') return null;
  return {
    id: raw.id,
    state: typeof raw.state === 'string' ? raw.state : null,
    billing_party_type:
      typeof raw.billing_party_type === 'string'
        ? raw.billing_party_type
        : typeof raw.billing_partner_type === 'string'
          ? raw.billing_partner_type
          : null,
    guardian_id: typeof raw.guardian_id === 'number' ? raw.guardian_id : null,
    billing_partner_id: typeof raw.billing_partner_id === 'number' ? raw.billing_partner_id : null,
    billing_partner_name:
      typeof raw.billing_partner_name === 'string' ? raw.billing_partner_name : null,
    effective_from: typeof raw.effective_from === 'string' ? raw.effective_from : null,
    effective_to: typeof raw.effective_to === 'string' ? raw.effective_to : null,
  };
}

function normalizeFinancialResponsible(value: unknown): StudentFinancialResponsible | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    guardian_id: typeof raw.guardian_id === 'number' ? raw.guardian_id : null,
    relationship_id: typeof raw.relationship_id === 'number' ? raw.relationship_id : null,
    name: typeof raw.name === 'string' ? raw.name : null,
  };
}

function normalizeCapabilities(value: unknown): StudentFinanceCapabilities {
  if (!value || typeof value !== 'object') return DEFAULT_CAPS;
  const raw = value as Record<string, unknown>;
  return {
    can_view: raw.can_view === true,
    can_view_payments: raw.can_view_payments === true,
    can_collect: raw.can_collect === true,
    can_assign_fees: raw.can_assign_fees === true,
    can_manage_discounts: raw.can_manage_discounts === true,
    can_approve_discounts: raw.can_approve_discounts === true,
    can_view_billing_profile: raw.can_view_billing_profile === true,
    can_manage_billing_profile: raw.can_manage_billing_profile === true,
  };
}

function normalizeConsistency(value: unknown): StudentFinanceConsistency | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    financial_responsible_matches_billing_profile:
      raw.financial_responsible_matches_billing_profile === true
        ? true
        : raw.financial_responsible_matches_billing_profile === false
          ? false
          : undefined,
  };
}

export function normalizeStudentFinanceSummaryResponse(data: unknown): StudentFinanceSummaryData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const yearRaw = raw.academic_year;
  if (!yearRaw || typeof yearRaw !== 'object' || typeof (yearRaw as { id?: unknown }).id !== 'number') {
    return null;
  }
  const year = yearRaw as { id: number; name: string; code?: string | null };
  return {
    academic_year: {
      id: year.id,
      name: typeof year.name === 'string' ? year.name : String(year.id),
      code: typeof year.code === 'string' ? year.code : null,
    },
    summary: normalizeSummaryTotals(raw.summary),
    billing_profile: normalizeBillingProfile(raw.billing_profile),
    financial_responsible: normalizeFinancialResponsible(raw.financial_responsible),
    capabilities: normalizeCapabilities(raw.capabilities),
    consistency: normalizeConsistency(raw.consistency),
  };
}

export function normalizeStudentFinanceOverviewSummary(
  value: unknown,
): StudentFinanceOverviewSummary | null {
  if (!value || typeof value !== 'object') return null;
  return normalizeSummaryTotals(value);
}

export function isFinanceZeroData(summary: StudentFinanceSummaryTotals): boolean {
  return (
    summary.total_assessed === 0 &&
    summary.total_discount === 0 &&
    summary.total_paid === 0 &&
    summary.total_outstanding === 0 &&
    summary.total_overdue === 0
  );
}
