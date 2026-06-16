import type { Pagination } from '@/types/api';
import type { PaymentCollection } from '@/types/finance';
import {
  normalizeMoneyValue,
  normalizePagination,
  parseFinanceList,
} from '@/lib/utils/finance-normalize';
import type {
  BillingAccountCreditDetail,
  BillingAccountRef,
  CollectionCreditDetail,
  CreditBalanceAllowedAction,
  CreditBalanceAmounts,
  CreditBalanceApplication,
  CreditBalanceAppliedFilters,
  CreditBalanceLifecycleState,
  CreditBalanceListItem,
  CreditBalanceListResult,
  CreditBalanceListSummary,
  CreditBalanceSource,
} from '@/types/finance-credit-balance';

const CREDIT_ALLOWED_ACTIONS: CreditBalanceAllowedAction[] = [
  'view_credit',
  'view_source_collection',
  'view_receipt',
  'apply_credit',
  'view_cheque',
];

export function normalizeCreditAllowedActions(raw: unknown): CreditBalanceAllowedAction[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      return CREDIT_ALLOWED_ACTIONS.filter((action) =>
        Boolean((raw as Record<string, boolean>)[action]),
      );
    }
    return [];
  }
  return raw.filter((action): action is CreditBalanceAllowedAction =>
    CREDIT_ALLOWED_ACTIONS.includes(action as CreditBalanceAllowedAction),
  );
}

export function hasCreditAction(
  actions: CreditBalanceAllowedAction[] | Record<string, boolean> | undefined,
  action: CreditBalanceAllowedAction,
): boolean {
  if (!actions) return false;
  if (Array.isArray(actions)) return actions.includes(action);
  return Boolean(actions[action]);
}

function readCreditAmounts(raw: Record<string, unknown>): CreditBalanceAmounts {
  return {
    gross_unallocated_amount: normalizeMoneyValue(raw.gross_unallocated_amount),
    pending_unallocated_amount: normalizeMoneyValue(raw.pending_unallocated_amount),
    available_credit_amount: normalizeMoneyValue(raw.available_credit_amount),
    blocked_unallocated_amount: normalizeMoneyValue(raw.blocked_unallocated_amount),
    applied_credit_amount: normalizeMoneyValue(raw.applied_credit_amount),
    refundable_credit_amount: normalizeMoneyValue(raw.refundable_credit_amount),
  };
}

function readBillingAccountRef(raw: unknown): BillingAccountRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = row.id ?? row.billing_partner_id;
  if (typeof id !== 'number') return null;
  const displayName =
    (typeof row.display_name === 'string' ? row.display_name : null) ??
    (typeof row.name === 'string' ? row.name : null);
  return {
    id,
    display_name: displayName ?? undefined,
    name: displayName ?? undefined,
    reference: typeof row.reference === 'string' ? row.reference : null,
  };
}

/** Derive UI lifecycle from official amount fields — never treat gross as available. */
export function deriveCreditLifecycleState(
  amounts: CreditBalanceAmounts,
): CreditBalanceLifecycleState {
  const gross = amounts.gross_unallocated_amount ?? 0;
  const available = amounts.available_credit_amount ?? 0;
  const pending = amounts.pending_unallocated_amount ?? 0;
  const blocked = amounts.blocked_unallocated_amount ?? 0;
  const applied = amounts.applied_credit_amount ?? 0;

  if (available > 0) return 'available';
  if (pending > 0) return 'pending';
  if (gross > 0 && blocked > 0) return 'blocked';
  if (gross <= 0 && applied > 0) return 'applied';
  if (gross <= 0) return 'fully_applied';
  return 'blocked';
}

export function normalizeCreditBalanceListItem(raw: unknown): CreditBalanceListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const billingPartnerId =
    typeof row.billing_partner_id === 'number'
      ? row.billing_partner_id
      : readBillingAccountRef(row.billing_account)?.id;
  if (billingPartnerId == null) return null;

  const account = readBillingAccountRef(row.billing_account ?? row.billing_partner);
  const amounts = readCreditAmounts(row);
  const lifecycle =
    (typeof row.lifecycle_state === 'string' ? row.lifecycle_state : null) ??
    deriveCreditLifecycleState(amounts);

  return {
    billing_partner_id: billingPartnerId,
    billing_account: account,
    display_name: account?.display_name ?? account?.name,
    reference: account?.reference ?? null,
    school_id: typeof row.school_id === 'number' ? row.school_id : null,
    currency: row.currency ?? row.currency_id,
    currency_id: typeof row.currency_id === 'number' ? row.currency_id : null,
    source_count: typeof row.source_count === 'number' ? row.source_count : null,
    lifecycle_state: lifecycle,
    allowed_actions: normalizeCreditAllowedActions(row.allowed_actions),
    ...amounts,
  };
}

export function normalizeCreditBalanceList(data: unknown): CreditBalanceListItem[] {
  return parseFinanceList<unknown>(data)
    .map(normalizeCreditBalanceListItem)
    .filter((row): row is CreditBalanceListItem => row != null);
}

function readListSummary(meta: unknown): CreditBalanceListSummary | null {
  if (!meta || typeof meta !== 'object') return null;
  const row = meta as Record<string, unknown>;
  const summaryRaw = row.summary ?? row.totals;
  if (!summaryRaw || typeof summaryRaw !== 'object') return null;
  const summary = summaryRaw as Record<string, unknown>;
  return {
    account_count:
      typeof summary.account_count === 'number'
        ? summary.account_count
        : typeof summary.total_accounts === 'number'
          ? summary.total_accounts
          : null,
    ...readCreditAmounts(summary),
  };
}

export function parseCreditBalanceListResponse(
  data: unknown,
  meta?: unknown,
): CreditBalanceListResult {
  const items = normalizeCreditBalanceList(data);
  const metaRow = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : null;
  const appliedRaw = metaRow?.applied_filters;
  return {
    items,
    summary: readListSummary(meta),
    appliedFilters:
      appliedRaw && typeof appliedRaw === 'object'
        ? (appliedRaw as CreditBalanceAppliedFilters)
        : null,
  };
}

export function aggregateCreditListSummary(
  items: CreditBalanceListItem[],
  pagination: Pagination | null,
): CreditBalanceListSummary | null {
  if (!pagination || pagination.total_pages > 1) return null;
  if (!items.length) {
    return {
      account_count: pagination.total,
      gross_unallocated_amount: 0,
      pending_unallocated_amount: 0,
      available_credit_amount: 0,
      blocked_unallocated_amount: 0,
      applied_credit_amount: 0,
      refundable_credit_amount: 0,
    };
  }
  const totals: CreditBalanceListSummary = {
    account_count: pagination.total,
    gross_unallocated_amount: 0,
    pending_unallocated_amount: 0,
    available_credit_amount: 0,
    blocked_unallocated_amount: 0,
    applied_credit_amount: 0,
    refundable_credit_amount: 0,
  };
  for (const item of items) {
    totals.gross_unallocated_amount =
      (totals.gross_unallocated_amount ?? 0) + (item.gross_unallocated_amount ?? 0);
    totals.pending_unallocated_amount =
      (totals.pending_unallocated_amount ?? 0) + (item.pending_unallocated_amount ?? 0);
    totals.available_credit_amount =
      (totals.available_credit_amount ?? 0) + (item.available_credit_amount ?? 0);
    totals.blocked_unallocated_amount =
      (totals.blocked_unallocated_amount ?? 0) + (item.blocked_unallocated_amount ?? 0);
    totals.applied_credit_amount =
      (totals.applied_credit_amount ?? 0) + (item.applied_credit_amount ?? 0);
    totals.refundable_credit_amount =
      (totals.refundable_credit_amount ?? 0) + (item.refundable_credit_amount ?? 0);
  }
  return totals;
}

export function normalizeCreditBalanceSource(raw: unknown): CreditBalanceSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const collectionId = row.collection_id ?? row.id;
  if (typeof collectionId !== 'number') return null;
  const amounts = readCreditAmounts(row);
  return {
    collection_id: collectionId,
    receipt_id: typeof row.receipt_id === 'number' ? row.receipt_id : null,
    receipt_number:
      (typeof row.receipt_number === 'string' ? row.receipt_number : null) ??
      (typeof row.reference === 'string' ? row.reference : null),
    payment_date:
      (typeof row.payment_date === 'string' ? row.payment_date : null) ??
      (typeof row.date === 'string' ? row.date : null),
    payment_method:
      (typeof row.payment_method === 'string' ? row.payment_method : null) ??
      (typeof row.method === 'string' ? row.method : null),
    amount: normalizeMoneyValue(row.amount ?? row.collection_amount),
    allocated_amount: normalizeMoneyValue(row.allocated_amount),
    unallocated_amount: normalizeMoneyValue(row.unallocated_amount),
    settlement_status:
      (typeof row.settlement_status === 'string' ? row.settlement_status : null) ??
      (typeof row.settlement_state === 'string' ? row.settlement_state : null),
    lifecycle_state:
      (typeof row.lifecycle_state === 'string' ? row.lifecycle_state : null) ??
      deriveCreditLifecycleState(amounts),
    block_reason: typeof row.block_reason === 'string' ? row.block_reason : null,
    student_id: typeof row.student_id === 'number' ? row.student_id : null,
    student_name: typeof row.student_name === 'string' ? row.student_name : null,
    currency: row.currency,
    allowed_actions: normalizeCreditAllowedActions(row.allowed_actions),
    ...amounts,
  };
}

export function normalizeCollectionCreditDetail(data: unknown): CollectionCreditDetail | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const collectionId = row.collection_id ?? row.id;
  if (typeof collectionId !== 'number') return null;
  const amounts = readCreditAmounts(row);
  const applications = parseFinanceList<unknown>(row.applications)
    .map(normalizeCreditApplication)
    .filter((a): a is CreditBalanceApplication => a != null);
  return {
    collection_id: collectionId,
    receipt_id: typeof row.receipt_id === 'number' ? row.receipt_id : null,
    receipt_number: typeof row.receipt_number === 'string' ? row.receipt_number : null,
    payment_date: typeof row.payment_date === 'string' ? row.payment_date : null,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : null,
    amount: normalizeMoneyValue(row.amount),
    allocated_amount: normalizeMoneyValue(row.allocated_amount),
    unallocated_amount: normalizeMoneyValue(row.unallocated_amount),
    currency: row.currency,
    billing_partner_id: typeof row.billing_partner_id === 'number' ? row.billing_partner_id : null,
    student_id: typeof row.student_id === 'number' ? row.student_id : null,
    student_name: typeof row.student_name === 'string' ? row.student_name : null,
    settlement_status: typeof row.settlement_status === 'string' ? row.settlement_status : null,
    cheque_state: typeof row.cheque_state === 'string' ? row.cheque_state : null,
    lifecycle_state:
      (typeof row.lifecycle_state === 'string' ? row.lifecycle_state : null) ??
      deriveCreditLifecycleState(amounts),
    block_reason: typeof row.block_reason === 'string' ? row.block_reason : null,
    cheque_id: typeof row.cheque_id === 'number' ? row.cheque_id : null,
    allowed_actions: normalizeCreditAllowedActions(row.allowed_actions),
    applications,
    ...amounts,
  };
}

function normalizeCreditApplication(raw: unknown): CreditBalanceApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: typeof row.id === 'number' ? row.id : undefined,
    installment_id: typeof row.installment_id === 'number' ? row.installment_id : undefined,
    student_id: typeof row.student_id === 'number' ? row.student_id : null,
    student_name: typeof row.student_name === 'string' ? row.student_name : null,
    service_name:
      (typeof row.service_name === 'string' ? row.service_name : null) ??
      (typeof row.name === 'string' ? row.name : null),
    amount: normalizeMoneyValue(row.amount),
    date:
      (typeof row.date === 'string' ? row.date : null) ??
      (typeof row.applied_at === 'string' ? row.applied_at : null),
    reference: typeof row.reference === 'string' ? row.reference : null,
  };
}

export function normalizeBillingAccountCreditDetail(
  data: unknown,
): BillingAccountCreditDetail | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const account =
    readBillingAccountRef(row.billing_account ?? row.billing_partner) ?? readBillingAccountRef(row);
  const billingPartnerId =
    typeof row.billing_partner_id === 'number' ? row.billing_partner_id : account?.id;
  if (!account || billingPartnerId == null) return null;
  const amounts = readCreditAmounts(row.summary && typeof row.summary === 'object' ? (row.summary as Record<string, unknown>) : row);
  const sources = parseFinanceList<unknown>(row.sources ?? row.source_collections)
    .map(normalizeCreditBalanceSource)
    .filter((s): s is CreditBalanceSource => s != null);
  return {
    billing_partner_id: billingPartnerId,
    billing_account: account,
    student_count: typeof row.student_count === 'number' ? row.student_count : null,
    currency: row.currency,
    lifecycle_state:
      (typeof row.lifecycle_state === 'string' ? row.lifecycle_state : null) ??
      deriveCreditLifecycleState(amounts),
    sources,
    allowed_actions: normalizeCreditAllowedActions(row.allowed_actions),
    ...amounts,
  };
}

/** Fallback source rows from payment collections list (no credit fields until drawer). */
export function collectionToCreditSourceFallback(coll: PaymentCollection): CreditBalanceSource | null {
  if (!coll.id) return null;
  const unallocated = coll.unallocated_amount ?? 0;
  if (unallocated <= 0) return null;
  return {
    collection_id: coll.id,
    receipt_id: coll.receipt_id ?? null,
    receipt_number: coll.receipt_number ?? coll.reference ?? null,
    payment_date: coll.collection_date ?? coll.date ?? null,
    payment_method: coll.payment_method ?? null,
    amount: coll.amount ?? coll.collection_amount ?? coll.total_amount ?? null,
    allocated_amount: coll.allocated_amount ?? null,
    unallocated_amount: unallocated,
    gross_unallocated_amount: unallocated,
    student_id: coll.student_id ?? null,
    student_name:
      coll.student && typeof coll.student === 'object'
        ? ((coll.student as { name?: string }).name ?? null)
        : null,
    currency: coll.currency,
    allowed_actions: normalizeCreditAllowedActions(coll.allowed_actions),
  };
}

export function creditBalanceErrorMessageKey(code: string | undefined): string {
  switch (code) {
    case 'billing_account_not_found':
    case 'credit_balance_not_found':
      return 'admin.finance.creditBalances.errors.notFound';
    case 'forbidden':
      return 'admin.finance.creditBalances.errors.forbidden';
    case 'invalid_filter':
      return 'admin.finance.creditBalances.errors.invalidFilter';
    default:
      return 'common.errorGeneric';
  }
}

export function applyCreditErrorMessageKey(code: string | undefined): string {
  switch (code) {
    case 'credit_balance_not_found':
      return 'admin.finance.creditBalances.applyErrors.creditBalanceNotFound';
    case 'credit_not_available':
      return 'admin.finance.creditBalances.applyErrors.creditNotAvailable';
    case 'insufficient_available_credit':
      return 'admin.finance.creditBalances.applyErrors.insufficientAvailableCredit';
    case 'credit_pending_settlement':
      return 'admin.finance.creditBalances.applyErrors.creditPendingSettlement';
    case 'credit_source_bounced':
      return 'admin.finance.creditBalances.applyErrors.creditSourceBounced';
    case 'credit_billing_account_mismatch':
      return 'admin.finance.creditBalances.applyErrors.creditBillingAccountMismatch';
    case 'credit_currency_mismatch':
      return 'admin.finance.creditBalances.applyErrors.creditCurrencyMismatch';
    case 'duplicate_credit_application':
      return 'admin.finance.creditBalances.applyErrors.duplicateCreditApplication';
    case 'forbidden':
      return 'admin.finance.creditBalances.applyErrors.forbidden';
    case 'validation_error':
      return 'admin.finance.creditBalances.applyErrors.validationError';
    default:
      return 'common.errorGeneric';
  }
}

export function canShowApplyCreditButton(
  detail: Pick<CollectionCreditDetail, 'available_credit_amount' | 'allowed_actions'>,
): boolean {
  return (
    (detail.available_credit_amount ?? 0) > 0 &&
    hasCreditAction(detail.allowed_actions, 'apply_credit')
  );
}

export { normalizePagination };
