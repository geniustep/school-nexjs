import { normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import type {
  AppliedFeePlanSummary,
  CollectibleItem,
  CollectibleItemsResponse,
  CollectibleItemsSummary,
  SpecialAgreementSummary,
  StudentFinancialOverview,
  StudentFinancialOverviewCounts,
  StudentFinancialOverviewNextInstallment,
  StudentFinancialOverviewTotals,
} from '@/types/student-financial-overview';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import { normalizeBillingProfile } from '@/features/admin/students/utils/normalize-student-finance';

function readMoney(value: unknown): number {
  return normalizeMoneyValue(value) ?? 0;
}

function normalizeCurrency(value: unknown): StudentFinanceCurrency {
  if (!value || typeof value !== 'object') {
    return { name: 'MAD', symbol: 'DH', position: 'after' };
  }
  const raw = value as Record<string, unknown>;
  return {
    name: typeof raw.name === 'string' ? raw.name : 'MAD',
    symbol: typeof raw.symbol === 'string' ? raw.symbol : 'DH',
    position: typeof raw.position === 'string' ? raw.position : 'after',
  };
}

function normalizeTotals(raw: Record<string, unknown>): StudentFinancialOverviewTotals {
  const currency = normalizeCurrency(raw.currency);
  return {
    currency,
    annual_total: readMoney(raw.annual_total ?? raw.total_assessed),
    due_to_date: readMoney(raw.due_to_date ?? raw.total_due_to_date),
    paid: readMoney(raw.paid ?? raw.total_paid),
    remaining: readMoney(raw.remaining ?? raw.total_outstanding),
    overdue: readMoney(raw.overdue ?? raw.total_overdue),
    upcoming: readMoney(raw.upcoming ?? raw.total_upcoming),
  };
}

function normalizeCounts(raw: unknown): StudentFinancialOverviewCounts {
  if (!raw || typeof raw !== 'object') {
    return { fees_count: 0, installments_count: 0 };
  }
  const obj = raw as Record<string, unknown>;
  return {
    fees_count: typeof obj.fees_count === 'number' ? obj.fees_count : 0,
    installments_count: typeof obj.installments_count === 'number' ? obj.installments_count : 0,
  };
}

export function normalizeNextInstallment(raw: unknown): StudentFinancialOverviewNextInstallment | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'number' ? obj.id : typeof obj.installment_id === 'number' ? obj.installment_id : null;
  if (id == null) return null;
  return {
    id,
    installment_id: typeof obj.installment_id === 'number' ? obj.installment_id : id,
    fee_name: typeof obj.fee_name === 'string' ? obj.fee_name : null,
    fee_type_name: typeof obj.fee_type_name === 'string' ? obj.fee_type_name : null,
    period_label: typeof obj.period_label === 'string' ? obj.period_label : null,
    period_start: typeof obj.period_start === 'string' ? obj.period_start : null,
    period_end: typeof obj.period_end === 'string' ? obj.period_end : null,
    amount: readMoney(obj.amount),
    paid_amount: readMoney(obj.paid_amount ?? obj.paid),
    remaining_amount: readMoney(obj.remaining_amount ?? obj.remaining),
    due_date: typeof obj.due_date === 'string' ? obj.due_date : null,
    state: typeof obj.state === 'string' ? obj.state : null,
    display_state: typeof obj.display_state === 'string' ? obj.display_state : null,
    timing_status: typeof obj.timing_status === 'string' ? obj.timing_status : null,
    payment_status: typeof obj.payment_status === 'string' ? obj.payment_status : null,
  };
}

function normalizeAppliedPlan(raw: unknown): AppliedFeePlanSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'number') return null;
  const yearRaw = obj.academic_year;
  let academicYear: AppliedFeePlanSummary['academic_year'] = null;
  if (yearRaw && typeof yearRaw === 'object' && typeof (yearRaw as { id?: unknown }).id === 'number') {
    const y = yearRaw as { id: number; name?: string; code?: string };
    academicYear = {
      id: y.id,
      name: typeof y.name === 'string' ? y.name : String(y.id),
      code: typeof y.code === 'string' ? y.code : null,
    };
  }
  return {
    id: obj.id,
    name: typeof obj.name === 'string' ? obj.name : `#${obj.id}`,
    code: typeof obj.code === 'string' ? obj.code : null,
    academic_year: academicYear,
    assigned_date: typeof obj.assigned_date === 'string' ? obj.assigned_date : null,
    total_fees: readMoney(obj.total_fees ?? obj.total_amount),
    paid: readMoney(obj.paid),
    remaining: readMoney(obj.remaining),
    fees_count: typeof obj.fees_count === 'number' ? obj.fees_count : 0,
    installments_count: typeof obj.installments_count === 'number' ? obj.installments_count : 0,
    state: typeof obj.state === 'string' ? obj.state : null,
  };
}

function normalizeSpecialAgreement(raw: unknown): SpecialAgreementSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'number') return null;
  return {
    id: obj.id,
    name: typeof obj.name === 'string' ? obj.name : null,
    state: typeof obj.state === 'string' ? obj.state : 'draft',
    net_amount: normalizeMoneyValue(obj.net_amount) ?? undefined,
    empty_draft: obj.empty_draft === true,
    source: typeof obj.source === 'string' ? obj.source : null,
    line_count: typeof obj.line_count === 'number' ? obj.line_count : undefined,
    total_amount: normalizeMoneyValue(obj.total_amount) ?? undefined,
  };
}

export function normalizeStudentFinancialOverview(data: unknown): StudentFinancialOverview | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const yearRaw = raw.academic_year;
  if (!yearRaw || typeof yearRaw !== 'object' || typeof (yearRaw as { id?: unknown }).id !== 'number') {
    return null;
  }
  const year = yearRaw as { id: number; name?: string; code?: string };
  const totalsRaw = raw.totals ?? raw.summary;
  if (!totalsRaw || typeof totalsRaw !== 'object') return null;

  const appliedRaw = Array.isArray(raw.applied_plans) ? raw.applied_plans : [];
  const appliedPlans = appliedRaw
    .map(normalizeAppliedPlan)
    .filter((p): p is AppliedFeePlanSummary => p != null);

  return {
    academic_year: {
      id: year.id,
      name: typeof year.name === 'string' && year.name.trim() ? year.name : String(year.id),
      code: typeof year.code === 'string' ? year.code : null,
    },
    totals: normalizeTotals(totalsRaw as Record<string, unknown>),
    counts: normalizeCounts(raw.counts),
    next_installment: normalizeNextInstallment(raw.next_installment),
    applied_plans: appliedPlans,
    special_agreement: normalizeSpecialAgreement(raw.special_agreement),
    billing_profile: normalizeBillingProfile(raw.billing_profile),
    billing_profile_id:
      typeof raw.billing_profile_id === 'number'
        ? raw.billing_profile_id
        : normalizeBillingProfile(raw.billing_profile)?.id ?? null,
    capabilities:
      raw.capabilities && typeof raw.capabilities === 'object'
        ? (raw.capabilities as StudentFinancialOverview['capabilities'])
        : undefined,
  };
}

export function normalizeCollectibleItem(raw: unknown): CollectibleItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const installmentId =
    typeof obj.installment_id === 'number'
      ? obj.installment_id
      : typeof obj.id === 'number'
        ? obj.id
        : null;
  if (installmentId == null) return null;
  const remaining = readMoney(obj.remaining_amount ?? obj.remaining);
  if (remaining <= 0) return null;
  return {
    id: installmentId,
    installment_id: installmentId,
    student_fee_id: typeof obj.student_fee_id === 'number' ? obj.student_fee_id : null,
    fee_name: typeof obj.fee_name === 'string' ? obj.fee_name : null,
    fee_type_name: typeof obj.fee_type_name === 'string' ? obj.fee_type_name : null,
    period_label: typeof obj.period_label === 'string' ? obj.period_label : null,
    period_start: typeof obj.period_start === 'string' ? obj.period_start : null,
    period_end: typeof obj.period_end === 'string' ? obj.period_end : null,
    due_date: typeof obj.due_date === 'string' ? obj.due_date : null,
    original_amount: readMoney(obj.original_amount ?? obj.amount),
    paid_amount: readMoney(obj.paid_amount ?? obj.paid),
    remaining_amount: remaining,
    state: typeof obj.state === 'string' ? obj.state : null,
    display_state: typeof obj.display_state === 'string' ? obj.display_state : null,
    timing_status: typeof obj.timing_status === 'string' ? obj.timing_status : null,
    payment_status: typeof obj.payment_status === 'string' ? obj.payment_status : null,
    selectable: obj.selectable !== false,
  };
}

function normalizeCollectibleSummary(raw: unknown): CollectibleItemsSummary {
  if (!raw || typeof raw !== 'object') {
    return {
      annual_total: 0,
      due_to_date: 0,
      paid: 0,
      remaining: 0,
      overdue: 0,
      upcoming: 0,
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    currency: obj.currency ? normalizeCurrency(obj.currency) : undefined,
    annual_total: readMoney(obj.annual_total),
    due_to_date: readMoney(obj.due_to_date),
    paid: readMoney(obj.paid),
    remaining: readMoney(obj.remaining),
    overdue: readMoney(obj.overdue),
    due_today: readMoney(obj.due_today),
    upcoming: readMoney(obj.upcoming),
  };
}

export function normalizeCollectibleItemsResponse(data: unknown): CollectibleItemsResponse | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw
    .map(normalizeCollectibleItem)
    .filter((item): item is CollectibleItem => item != null && item.selectable);
  return {
    academic_year_id: typeof raw.academic_year_id === 'number' ? raw.academic_year_id : undefined,
    billing_profile_id:
      typeof raw.billing_profile_id === 'number' ? raw.billing_profile_id : null,
    summary: normalizeCollectibleSummary(raw.summary),
    items,
  };
}
