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
  ChequeSummary,
} from '@/types/student-financial-overview';
import type {
  AgreementCustomization,
  AgreementFinancialSummary,
} from '@/types/agreement-finance-summary';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import type { CollectionGate, CollectibleBillingContext } from '@/types/payment-collection-preview';
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
    paid_confirmed: readMoney(raw.paid_confirmed ?? raw.confirmed_paid),
    pending_cheque: readMoney(raw.pending_cheque ?? raw.pending_cheques ?? raw.pending_cheque_amount),
    covered_total: readMoney(raw.covered_total ?? raw.paid),
    remaining: readMoney(raw.remaining ?? raw.total_outstanding),
    overdue: readMoney(raw.overdue ?? raw.total_overdue),
    upcoming: readMoney(raw.upcoming ?? raw.total_upcoming),
  };
}

function readChequeBucket(
  obj: Record<string, unknown>,
  nestedKey: string,
  countKey: string,
  amountKey: string,
): { count: number; amount: number } {
  const nested = obj[nestedKey];
  if (nested && typeof nested === 'object') {
    const bucket = nested as Record<string, unknown>;
    return {
      count: typeof bucket.count === 'number' ? bucket.count : 0,
      amount: readMoney(bucket.amount),
    };
  }
  return {
    count: typeof obj[countKey] === 'number' ? (obj[countKey] as number) : 0,
    amount: readMoney(obj[amountKey]),
  };
}

function normalizeChequeSummary(raw: unknown): ChequeSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const cleared = readChequeBucket(obj, 'cleared', 'settled_count', 'settled_amount');
  const settled = readChequeBucket(obj, 'settled', 'settled_count', 'settled_amount');
  const rejectedOrReturned = readChequeBucket(
    obj,
    'rejected_or_returned',
    'rejected_count',
    'rejected_amount',
  );
  const cancelled = readChequeBucket(obj, 'cancelled', 'cancelled_count', 'cancelled_amount');

  const summary: ChequeSummary = {
    pending_count: readChequeBucket(obj, 'pending', 'pending_count', 'pending_amount').count,
    pending_amount: readChequeBucket(obj, 'pending', 'pending_count', 'pending_amount').amount,
    settled_count: cleared.count > 0 ? cleared.count : settled.count,
    settled_amount: cleared.amount > 0 ? cleared.amount : settled.amount,
    rejected_count: rejectedOrReturned.count,
    rejected_amount: rejectedOrReturned.amount,
    cancelled_count: cancelled.count,
    cancelled_amount: cancelled.amount,
    cancelled_note: typeof obj.cancelled_note === 'string' ? obj.cancelled_note : null,
  };

  const hasData =
    summary.pending_count > 0 ||
    summary.pending_amount > 0 ||
    summary.settled_count > 0 ||
    summary.settled_amount > 0 ||
    summary.rejected_count > 0 ||
    summary.rejected_amount > 0 ||
    summary.cancelled_count > 0 ||
    summary.cancelled_amount > 0;
  return hasData ? summary : null;
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
    display_label: typeof obj.display_label === 'string' ? obj.display_label : null,
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
    installment_sequence:
      typeof obj.installment_sequence === 'number'
        ? obj.installment_sequence
        : typeof obj.sequence === 'number'
          ? obj.sequence
          : null,
    installment_count: typeof obj.installment_count === 'number' ? obj.installment_count : null,
    coverage_status: typeof obj.coverage_status === 'string' ? obj.coverage_status : null,
    pending_cheque_amount: readMoney(obj.pending_cheque_amount),
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

function normalizeFinancialSummary(raw: unknown): AgreementFinancialSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const summary: AgreementFinancialSummary = {
    original_total: normalizeMoneyValue(obj.original_total) ?? undefined,
    discount_total: normalizeMoneyValue(obj.discount_total) ?? undefined,
    surcharge_total: normalizeMoneyValue(obj.surcharge_total) ?? undefined,
    net_total: normalizeMoneyValue(obj.net_total) ?? undefined,
    final_total: normalizeMoneyValue(obj.final_total) ?? undefined,
    one_time_total: normalizeMoneyValue(obj.one_time_total) ?? undefined,
    recurring_total_after_discount:
      normalizeMoneyValue(obj.recurring_total_after_discount) ?? undefined,
    monthly_due_amount: normalizeMoneyValue(obj.monthly_due_amount) ?? undefined,
    schedule_total: normalizeMoneyValue(obj.schedule_total) ?? undefined,
    paid_amount: normalizeMoneyValue(obj.paid_amount) ?? undefined,
    remaining_amount: normalizeMoneyValue(obj.remaining_amount) ?? undefined,
  };
  return Object.values(summary).some((value) => value != null) ? summary : undefined;
}

function normalizeCustomization(raw: unknown): AgreementCustomization | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const periodsRaw = Array.isArray(obj.periods) ? obj.periods : [];
  const periods = periodsRaw
    .map((period) => {
      if (!period || typeof period !== 'object') return null;
      const p = period as Record<string, unknown>;
      return {
        period_key: typeof p.period_key === 'string' ? p.period_key : undefined,
        label: typeof p.label === 'string' ? p.label : undefined,
        selected: p.selected !== false,
      };
    })
    .filter((period): period is NonNullable<typeof period> => period != null);

  return {
    kind: typeof obj.kind === 'string' ? obj.kind : undefined,
    scope: typeof obj.scope === 'string' ? obj.scope : undefined,
    discount_type: typeof obj.discount_type === 'string' ? obj.discount_type : undefined,
    discount_value: typeof obj.discount_value === 'number' ? obj.discount_value : undefined,
    reason: typeof obj.reason === 'string' ? obj.reason : undefined,
    line_id: typeof obj.line_id === 'number' ? obj.line_id : undefined,
    line_name: typeof obj.line_name === 'string' ? obj.line_name : undefined,
    original_amount: normalizeMoneyValue(obj.original_amount) ?? undefined,
    final_amount: normalizeMoneyValue(obj.final_amount) ?? undefined,
    selected: obj.selected === true,
    due_date_override:
      typeof obj.due_date_override === 'string' ? obj.due_date_override : null,
    periods: periods.length ? periods : undefined,
  };
}

function normalizeCustomizationList(raw: unknown): AgreementCustomization[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCustomization).filter((item): item is AgreementCustomization => item != null);
}

function normalizeSpecialAgreement(raw: unknown): SpecialAgreementSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id =
    typeof obj.id === 'number'
      ? obj.id
      : typeof obj.agreement_id === 'number'
        ? obj.agreement_id
        : null;
  if (id == null && obj.exists !== true) return null;
  if (obj.exists === false) return null;
  if (id == null) return null;

  return {
    id,
    agreement_id: typeof obj.agreement_id === 'number' ? obj.agreement_id : undefined,
    exists: obj.exists === true ? true : undefined,
    name: typeof obj.name === 'string' ? obj.name : null,
    state: typeof obj.state === 'string' ? obj.state : 'draft',
    net_amount: normalizeMoneyValue(obj.net_amount) ?? undefined,
    empty_draft: obj.empty_draft === true,
    source: typeof obj.source === 'string' ? obj.source : null,
    line_count: typeof obj.line_count === 'number' ? obj.line_count : undefined,
    adjustment_count: typeof obj.adjustment_count === 'number' ? obj.adjustment_count : undefined,
    total_amount: normalizeMoneyValue(obj.total_amount) ?? undefined,
    creates_due_after_confirmation: obj.creates_due_after_confirmation === true,
    is_plan_customized: obj.is_plan_customized === true,
    financial_summary: normalizeFinancialSummary(obj.financial_summary),
    draft_totals: normalizeFinancialSummary(obj.draft_totals),
    customizations: normalizeCustomizationList(obj.customizations),
    enrollment_customizations: normalizeCustomizationList(obj.enrollment_customizations),
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
    cheque_summary: normalizeChequeSummary(raw.cheque_summary),
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
    display_label: typeof obj.display_label === 'string' ? obj.display_label : null,
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

function normalizeCollectionGate(raw: unknown): CollectionGate | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    collect_allowed: obj.collect_allowed === true,
    collect_block_reason:
      typeof obj.collect_block_reason === 'string' ? obj.collect_block_reason : null,
    collect_block_message:
      typeof obj.collect_block_message === 'string' ? obj.collect_block_message : null,
    prepayment_allowed: obj.prepayment_allowed === true,
  };
}

function normalizeBillingContext(raw: unknown): CollectibleBillingContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    mode: typeof obj.mode === 'string' ? obj.mode : null,
    has_active_agreement: obj.has_active_agreement === true,
    has_operational_fees: obj.has_operational_fees === true,
    message: typeof obj.message === 'string' ? obj.message : null,
  };
}

function normalizeCollectibleItemLoose(raw: unknown): CollectibleItem | null {
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
  return {
    id: installmentId,
    installment_id: installmentId,
    student_fee_id: typeof obj.student_fee_id === 'number' ? obj.student_fee_id : null,
    fee_name: typeof obj.fee_name === 'string' ? obj.fee_name : null,
    fee_type_name: typeof obj.fee_type_name === 'string' ? obj.fee_type_name : null,
    display_label: typeof obj.display_label === 'string' ? obj.display_label : null,
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

export function normalizeCollectibleItemsResponse(data: unknown): CollectibleItemsResponse | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const lookupItems = itemsRaw
    .map(normalizeCollectibleItemLoose)
    .filter((item): item is CollectibleItem => item != null);
  const items = lookupItems.filter((item) => item.selectable && item.remaining_amount > 0);
  return {
    academic_year_id: typeof raw.academic_year_id === 'number' ? raw.academic_year_id : undefined,
    billing_profile_id:
      typeof raw.billing_profile_id === 'number' ? raw.billing_profile_id : null,
    billing_partner_id:
      typeof raw.billing_partner_id === 'number'
        ? raw.billing_partner_id
        : typeof (raw.billing_profile as { billing_partner_id?: unknown } | undefined)
              ?.billing_partner_id === 'number'
          ? (raw.billing_profile as { billing_partner_id: number }).billing_partner_id
          : null,
    billing_partner_name:
      typeof raw.billing_partner_name === 'string'
        ? raw.billing_partner_name
        : typeof (raw.billing_profile as { billing_partner_name?: unknown } | undefined)
              ?.billing_partner_name === 'string'
          ? (raw.billing_profile as { billing_partner_name: string }).billing_partner_name
          : null,
    billing_party_type:
      typeof raw.billing_party_type === 'string'
        ? raw.billing_party_type
        : typeof (raw.billing_profile as { billing_party_type?: unknown } | undefined)
              ?.billing_party_type === 'string'
          ? (raw.billing_profile as { billing_party_type: string }).billing_party_type
          : null,
    billing_context: normalizeBillingContext(raw.billing_context),
    collection_gate: normalizeCollectionGate(raw.collection_gate),
    summary: normalizeCollectibleSummary(raw.summary),
    items,
    lookup_items: lookupItems,
  };
}
