import type { Pagination } from '@/types/api';
import {
  normalizeMoneyValue,
  normalizePagination,
  parseFinanceList,
} from '@/lib/utils/finance-normalize';
import { normalizeApiAccountKind } from '@/features/admin/finance/billing-account-kind';
import type {
  BillingAccountActivity,
  BillingAccountAllowedAction,
  BillingAccountAppliedFilters,
  BillingAccountCreditMetrics,
  BillingAccountDataQualityPayload,
  BillingAccountListItem,
  BillingAccountPartner,
  BillingAccountStudentRow,
  BillingAccountSummaryMetrics,
  BillingAccountSummaryPayload,
} from '@/types/finance-billing-account';

const ALLOWED_ACTIONS: BillingAccountAllowedAction[] = [
  'view_summary',
  'view_collections',
  'view_receipts',
  'collect_payment',
  'view_cheques',
  'view_agreements',
  'view_credit',
];

function readCreditMetrics(raw: unknown): BillingAccountCreditMetrics | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  return {
    gross_unallocated_amount: normalizeMoneyValue(row.gross_unallocated_amount) ?? undefined,
    pending_unallocated_amount: normalizeMoneyValue(row.pending_unallocated_amount) ?? undefined,
    available_credit_amount: normalizeMoneyValue(row.available_credit_amount) ?? undefined,
    blocked_unallocated_amount: normalizeMoneyValue(row.blocked_unallocated_amount) ?? undefined,
    applied_credit_amount: normalizeMoneyValue(row.applied_credit_amount) ?? undefined,
    refundable_credit_amount: normalizeMoneyValue(row.refundable_credit_amount) ?? undefined,
  };
}

function readPartnerId(raw: Record<string, unknown>): number | null {
  const direct = raw.billing_partner_id ?? raw.billing_partnerId;
  if (typeof direct === 'number' && !Number.isNaN(direct)) return direct;
  const partner = raw.billing_partner ?? raw.billing_account ?? raw.payer;
  if (partner && typeof partner === 'object') {
    const id = (partner as Record<string, unknown>).id;
    if (typeof id === 'number' && !Number.isNaN(id)) return id;
  }
  if (typeof raw.id === 'number' && !Number.isNaN(raw.id)) return raw.id;
  return null;
}

function readPartner(raw: Record<string, unknown>): BillingAccountPartner | null {
  const id = readPartnerId(raw);
  if (id == null) return null;
  const nested = (raw.billing_partner ?? raw.billing_account ?? raw.payer) as
    | Record<string, unknown>
    | undefined;
  const displayName =
    (typeof raw.display_name === 'string' ? raw.display_name : null) ??
    (typeof nested?.display_name === 'string' ? nested.display_name : null) ??
    (typeof nested?.name === 'string' ? nested.name : null) ??
    (typeof raw.name === 'string' ? raw.name : null);
  return {
    id,
    display_name: displayName ?? undefined,
    name: displayName ?? undefined,
    reference:
      (typeof raw.reference === 'string' ? raw.reference : null) ??
      (typeof nested?.reference === 'string' ? nested.reference : null),
    account_type:
      (typeof raw.account_type === 'string' ? raw.account_type : undefined) ??
      (typeof nested?.account_type === 'string' ? nested.account_type : undefined),
    student_count:
      typeof raw.student_count === 'number'
        ? raw.student_count
        : typeof nested?.student_count === 'number'
          ? nested.student_count
          : undefined,
    school_ids: Array.isArray(raw.school_ids)
      ? (raw.school_ids as number[])
      : Array.isArray(nested?.school_ids)
        ? (nested.school_ids as number[])
        : undefined,
    phone:
      (typeof raw.phone === 'string' ? raw.phone : null) ??
      (typeof nested?.phone === 'string' ? nested.phone : null),
    email:
      (typeof raw.email === 'string' ? raw.email : null) ??
      (typeof nested?.email === 'string' ? nested.email : null),
  };
}

function readMetrics(raw: Record<string, unknown>): BillingAccountSummaryMetrics {
  return {
    student_count:
      typeof raw.student_count === 'number' ? raw.student_count : undefined,
    total_due: normalizeMoneyValue(raw.total_due) ?? undefined,
    confirmed_paid: normalizeMoneyValue(raw.confirmed_paid) ?? undefined,
    total_remaining: normalizeMoneyValue(raw.total_remaining) ?? undefined,
    total_overdue: normalizeMoneyValue(raw.total_overdue) ?? undefined,
    pending_cheque_amount: normalizeMoneyValue(raw.pending_cheque_amount) ?? undefined,
    confirmed_collection_amount: normalizeMoneyValue(raw.confirmed_collection_amount) ?? undefined,
    unallocated_collection_amount: normalizeMoneyValue(raw.unallocated_collection_amount) ?? undefined,
    receipt_count: typeof raw.receipt_count === 'number' ? raw.receipt_count : undefined,
    receipt_amount: normalizeMoneyValue(raw.receipt_amount) ?? undefined,
    collection_count:
      typeof raw.collection_count === 'number' ? raw.collection_count : undefined,
    currency: raw.currency,
    credit: readCreditMetrics(raw.credit),
  };
}

export function normalizeBillingAccountListItem(raw: unknown): BillingAccountListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const billing_partner_id = readPartnerId(row);
  if (billing_partner_id == null) return null;
  const partner = readPartner(row);
  const metrics = readMetrics(row.summary && typeof row.summary === 'object' ? (row.summary as Record<string, unknown>) : row);
  return {
    billing_partner_id,
    billing_partner: partner,
    display_name: partner?.display_name ?? partner?.name,
    reference: partner?.reference ?? null,
    student_count: metrics.student_count ?? partner?.student_count,
    account_kind: normalizeApiAccountKind(row.account_kind) ?? undefined,
    total_due: metrics.total_due ?? undefined,
    confirmed_paid: metrics.confirmed_paid ?? undefined,
    total_remaining: metrics.total_remaining ?? undefined,
    total_overdue: metrics.total_overdue ?? undefined,
    pending_cheque_amount: metrics.pending_cheque_amount ?? undefined,
    confirmed_collection_amount: metrics.confirmed_collection_amount ?? undefined,
    unallocated_collection_amount: metrics.unallocated_collection_amount ?? undefined,
    status: typeof row.status === 'string' ? row.status : null,
    status_label:
      (typeof row.status_label === 'string' ? row.status_label : null) ??
      (typeof row.account_status_label === 'string' ? row.account_status_label : null),
    currency: metrics.currency ?? row.currency,
  };
}

export function normalizeBillingAccountList(data: unknown): BillingAccountListItem[] {
  return parseFinanceList<unknown>(data)
    .map(normalizeBillingAccountListItem)
    .filter((row): row is BillingAccountListItem => row != null);
}

export type BillingAccountListResult = {
  items: BillingAccountListItem[];
  pagination: Pagination | null;
  appliedFilters: BillingAccountAppliedFilters | null;
};

export function parseBillingAccountListResponse(
  data: unknown,
  meta?: unknown,
): BillingAccountListResult {
  const items = normalizeBillingAccountList(data);
  const metaRow = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : null;
  const appliedRaw = metaRow?.applied_filters;
  const appliedFilters =
    appliedRaw && typeof appliedRaw === 'object'
      ? (appliedRaw as BillingAccountAppliedFilters)
      : null;
  return {
    items,
    pagination: normalizePagination(meta),
    appliedFilters,
  };
}

export function normalizeAllowedActions(raw: unknown): BillingAccountAllowedAction[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      return ALLOWED_ACTIONS.filter((action) => Boolean((raw as Record<string, boolean>)[action]));
    }
    return [];
  }
  return raw.filter((action): action is BillingAccountAllowedAction =>
    ALLOWED_ACTIONS.includes(action as BillingAccountAllowedAction),
  );
}

export function normalizeBillingAccountStudent(raw: unknown): BillingAccountStudentRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const student_id = row.student_id;
  if (typeof student_id !== 'number') return null;
  return {
    student_id,
    student_name:
      (typeof row.student_name === 'string' ? row.student_name : undefined) ??
      (typeof row.name === 'string' ? row.name : undefined),
    student_code: typeof row.student_code === 'string' ? row.student_code : null,
    class_name: typeof row.class_name === 'string' ? row.class_name : null,
    level_name: typeof row.level_name === 'string' ? row.level_name : null,
    active_agreements_count:
      typeof row.active_agreements_count === 'number' ? row.active_agreements_count : undefined,
    total_due: normalizeMoneyValue(row.total_due) ?? undefined,
    confirmed_paid: normalizeMoneyValue(row.confirmed_paid) ?? undefined,
    total_remaining: normalizeMoneyValue(row.total_remaining) ?? undefined,
    total_overdue: normalizeMoneyValue(row.total_overdue) ?? undefined,
    pending_cheque_amount: normalizeMoneyValue(row.pending_cheque_amount) ?? undefined,
    next_installment_date:
      typeof row.next_installment_date === 'string'
        ? row.next_installment_date
        : typeof row.next_due_date === 'string'
          ? row.next_due_date
          : null,
    receipt_count: typeof row.receipt_count === 'number' ? row.receipt_count : undefined,
    currency: row.currency,
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeBillingAccountActivity(raw: unknown): BillingAccountActivity | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: typeof row.id === 'number' || typeof row.id === 'string' ? row.id : undefined,
    type: typeof row.type === 'string' ? row.type : undefined,
    activity_type:
      (typeof row.activity_type === 'string' ? row.activity_type : undefined) ??
      (typeof row.type === 'string' ? row.type : undefined),
    label: typeof row.label === 'string' ? row.label : undefined,
    date:
      (typeof row.date === 'string' ? row.date : undefined) ??
      (typeof row.occurred_at === 'string' ? row.occurred_at : undefined),
    occurred_at: typeof row.occurred_at === 'string' ? row.occurred_at : undefined,
    amount: normalizeMoneyValue(row.amount),
    currency: row.currency,
    student_id: typeof row.student_id === 'number' ? row.student_id : null,
    student_name: typeof row.student_name === 'string' ? row.student_name : null,
    reference:
      (typeof row.reference === 'string' ? row.reference : null) ??
      (typeof row.name === 'string' ? row.name : null),
    state: typeof row.state === 'string' ? row.state : null,
    state_label: typeof row.state_label === 'string' ? row.state_label : null,
    entity_type: typeof row.entity_type === 'string' ? row.entity_type : null,
    entity_id: typeof row.entity_id === 'number' ? row.entity_id : null,
    collection_id: typeof row.collection_id === 'number' ? row.collection_id : null,
    receipt_id: typeof row.receipt_id === 'number' ? row.receipt_id : null,
    cheque_id: typeof row.cheque_id === 'number' ? row.cheque_id : null,
    installment_id: typeof row.installment_id === 'number' ? row.installment_id : null,
  };
}

export function normalizeBillingAccountSummary(data: unknown): BillingAccountSummaryPayload | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const accountRaw = row.billing_account ?? row.billing_partner ?? row.account;
  const partner =
    accountRaw && typeof accountRaw === 'object'
      ? readPartner({ billing_partner: accountRaw, ...(accountRaw as Record<string, unknown>) })
      : readPartner(row);
  if (!partner) return null;
  const summaryRaw = row.summary && typeof row.summary === 'object' ? row.summary : row;
  const summary = readMetrics(summaryRaw as Record<string, unknown>);
  const students = parseFinanceList<unknown>(row.students)
    .map(normalizeBillingAccountStudent)
    .filter((s): s is BillingAccountStudentRow => s != null);
  const recent_activity = parseFinanceList<unknown>(row.recent_activity)
    .map(normalizeBillingAccountActivity)
    .filter((a): a is BillingAccountActivity => a != null);
  const appliedRaw = row.applied_filters;
  return {
    billing_account: partner,
    summary,
    students,
    recent_activity,
    applied_filters:
      appliedRaw && typeof appliedRaw === 'object'
        ? (appliedRaw as BillingAccountAppliedFilters)
        : {},
    allowed_actions: normalizeAllowedActions(row.allowed_actions),
  };
}

export function normalizeBillingAccountDataQuality(data: unknown): BillingAccountDataQualityPayload {
  if (!data || typeof data !== 'object') {
    return {
      students_without_billing_profile: [],
      agreements_without_payer: [],
      collections_without_payer: [],
      payer_conflicts: [],
      collection_payer_mismatches: [],
      unassigned_billing_account: [],
      counts: {},
    };
  }
  const row = data as Record<string, unknown>;
  return {
    students_without_billing_profile: parseFinanceList(row.students_without_billing_profile).map((item) => {
      const r = item as Record<string, unknown>;
      return {
        student_id: Number(r.student_id),
        student_name: typeof r.student_name === 'string' ? r.student_name : undefined,
        student_code: typeof r.student_code === 'string' ? r.student_code : null,
      };
    }),
    agreements_without_payer: parseFinanceList(row.agreements_without_payer),
    collections_without_payer: parseFinanceList(row.collections_without_payer),
    payer_conflicts: parseFinanceList(row.payer_conflicts),
    collection_payer_mismatches: parseFinanceList(row.collection_payer_mismatches),
    unassigned_billing_account: parseFinanceList(row.unassigned_billing_account),
    counts:
      row.counts && typeof row.counts === 'object'
        ? (row.counts as Record<string, number>)
        : {},
  };
}

export function billingAccountHasFinancialData(summary: BillingAccountSummaryMetrics): boolean {
  const values = [
    summary.total_due,
    summary.confirmed_paid,
    summary.total_remaining,
    summary.total_overdue,
    summary.pending_cheque_amount,
    summary.confirmed_collection_amount,
    summary.unallocated_collection_amount,
    summary.receipt_count,
    summary.collection_count,
  ];
  return values.some((value) => value != null && value !== 0);
}

export function billingAccountErrorMessageKey(code: string | undefined): string {
  switch (code) {
    case 'billing_account_not_found':
      return 'admin.finance.billingAccounts.errors.notFound';
    case 'academic_year_out_of_scope':
      return 'admin.finance.billingAccounts.errors.yearOutOfScope';
    case 'invalid_filter':
      return 'admin.finance.billingAccounts.errors.invalidFilter';
    case 'forbidden':
      return 'admin.finance.billingAccounts.errors.forbidden';
    default:
      return 'common.errorGeneric';
  }
}

export function buildBillingAccountDrillDownHref(
  target: 'installments' | 'collections' | 'receipts' | 'agreements' | 'cheques',
  billingPartnerId: number | string,
  returnTo: string,
): string {
  const params = new URLSearchParams({
    billing_partner_id: String(billingPartnerId),
    returnTo,
  });
  return `/admin/finance/${target}?${params.toString()}`;
}

export function normalizeBillingActivityStateKey(
  state?: string | null,
  stateLabel?: string | null,
): string | null {
  const raw = (state ?? stateLabel ?? '').trim();
  if (!raw) return null;
  return raw
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

type BillingActivityLabelInput = Pick<
  BillingAccountActivity,
  'label' | 'activity_type' | 'type' | 'state' | 'state_label'
>;

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function resolveBillingActivityTypeLabel(
  activity: Partial<Pick<BillingActivityLabelInput, 'label' | 'activity_type' | 'type'>>,
  t: TranslateFn,
): string {
  const custom = activity.label?.trim();
  if (custom) return custom;
  const type = activity.activity_type ?? activity.type ?? 'generic';
  const key = `admin.finance.billingAccounts.activity.types.${type}`;
  const label = t(key);
  return label !== key ? label : type.replace(/_/g, ' ');
}

export function resolveBillingActivityStateLabel(
  activity: Partial<Pick<BillingActivityLabelInput, 'state' | 'state_label'>>,
  t: TranslateFn,
): string | null {
  const stateKey = normalizeBillingActivityStateKey(activity.state, activity.state_label);
  if (!stateKey) return null;

  const activityStateKey = `admin.finance.billingAccounts.activity.states.${stateKey}`;
  const activityLabel = t(activityStateKey);
  if (activityLabel !== activityStateKey) return activityLabel;

  const chequeKey = `admin.finance.cheques.states.${stateKey}`;
  const chequeLabel = t(chequeKey);
  if (chequeLabel !== chequeKey) return chequeLabel;

  return activity.state_label?.trim() || activity.state?.trim() || null;
}

export function buildBillingAccountCollectHref(
  billingPartnerId: number | string,
  returnTo: string,
  academicYearId?: string | number | null,
): string {
  const params = new URLSearchParams({
    billing_partner_id: String(billingPartnerId),
    returnTo,
  });
  if (academicYearId != null && academicYearId !== '') {
    params.set('academic_year_id', String(academicYearId));
  }
  return `/admin/finance/collections/new?${params.toString()}`;
}
