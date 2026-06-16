import { currencyCode, refName } from '@/lib/utils/finance';
import {
  normalizeMoneyValue,
  normalizePagination,
  parseFinanceList,
} from '@/lib/utils/finance-normalize';
import type { Pagination } from '@/types/api';
import type {
  CashSession,
  CashSessionAction,
  CashSessionAuditEvent,
  CashSessionCollectionRow,
  CashSessionCurrentResponse,
  CashSessionListResult,
  CashSessionMovement,
  CashSessionReceiptRow,
  CashSessionSummary,
} from '@/types/finance-cash-desk';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeSummary(raw: unknown): CashSessionSummary | undefined {
  const row = asRecord(raw);
  if (!row) return undefined;
  return {
    opening_balance: normalizeMoneyValue(row.opening_balance) ?? undefined,
    cash_collections_total:
      normalizeMoneyValue(row.cash_collections_total ?? row.confirmed_cash_collections) ?? undefined,
    movements_in_total:
      normalizeMoneyValue(row.movements_in_total ?? row.total_cash_in ?? row.cash_in_total) ?? undefined,
    movements_out_total:
      normalizeMoneyValue(row.movements_out_total ?? row.total_cash_out ?? row.cash_out_total) ?? undefined,
    expected_balance: normalizeMoneyValue(row.expected_balance) ?? undefined,
    collections_count:
      typeof row.collections_count === 'number'
        ? row.collections_count
        : typeof row.cash_collections_count === 'number'
          ? row.cash_collections_count
          : undefined,
    receipts_count: typeof row.receipts_count === 'number' ? row.receipts_count : undefined,
    total_cash_in: normalizeMoneyValue(row.total_cash_in) ?? undefined,
    total_cash_out: normalizeMoneyValue(row.total_cash_out) ?? undefined,
  };
}

function normalizeMovement(raw: unknown): CashSessionMovement | null {
  const row = asRecord(raw);
  if (!row || row.id == null) return null;
  return {
    id: Number(row.id),
    type: typeof row.type === 'string' ? row.type : typeof row.movement_type === 'string' ? row.movement_type : undefined,
    type_label:
      typeof row.type_label === 'string'
        ? row.type_label
        : typeof row.label === 'string'
          ? row.label
          : undefined,
    amount: normalizeMoneyValue(row.amount) ?? undefined,
    reason: typeof row.reason === 'string' ? row.reason : undefined,
    reference: typeof row.reference === 'string' ? row.reference : undefined,
    note: typeof row.note === 'string' ? row.note : undefined,
    created_at:
      typeof row.created_at === 'string'
        ? row.created_at
        : typeof row.date === 'string'
          ? row.date
          : undefined,
    created_by:
      row.created_by && typeof row.created_by === 'object'
        ? (row.created_by as CashSessionMovement['created_by'])
        : undefined,
    state: typeof row.state === 'string' ? row.state : undefined,
  };
}

function normalizeCollectionRow(raw: unknown): CashSessionCollectionRow | null {
  const row = asRecord(raw);
  if (!row || row.id == null) return null;
  return {
    id: Number(row.id),
    number: typeof row.number === 'string' ? row.number : typeof row.reference === 'string' ? row.reference : undefined,
    reference: typeof row.reference === 'string' ? row.reference : undefined,
    receipt_id: typeof row.receipt_id === 'number' ? row.receipt_id : undefined,
    receipt_number:
      typeof row.receipt_number === 'string'
        ? row.receipt_number
        : typeof row.receipt_no === 'string'
          ? row.receipt_no
          : undefined,
    date:
      typeof row.date === 'string'
        ? row.date
        : typeof row.collection_date === 'string'
          ? row.collection_date
          : undefined,
    collection_date: typeof row.collection_date === 'string' ? row.collection_date : undefined,
    payer_name: typeof row.payer_name === 'string' ? row.payer_name : refName(row.payer as never) ?? undefined,
    student_name:
      typeof row.student_name === 'string'
        ? row.student_name
        : refName(row.student as never) ?? undefined,
    student: row.student as CashSessionCollectionRow['student'],
    payer: row.payer as CashSessionCollectionRow['payer'],
    amount: normalizeMoneyValue(row.amount) ?? undefined,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : undefined,
    state: typeof row.state === 'string' ? row.state : typeof row.status === 'string' ? row.status : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
  };
}

function normalizeReceiptRow(raw: unknown): CashSessionReceiptRow | null {
  const row = asRecord(raw);
  if (!row || row.id == null) return null;
  return {
    id: Number(row.id),
    number:
      typeof row.number === 'string'
        ? row.number
        : typeof row.receipt_number === 'string'
          ? row.receipt_number
          : undefined,
    receipt_number: typeof row.receipt_number === 'string' ? row.receipt_number : undefined,
    date: typeof row.date === 'string' ? row.date : undefined,
    amount: normalizeMoneyValue(row.amount) ?? undefined,
    collection_id: typeof row.collection_id === 'number' ? row.collection_id : undefined,
    state: typeof row.state === 'string' ? row.state : undefined,
  };
}

function normalizeAuditEvent(raw: unknown): CashSessionAuditEvent | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = row.id ?? row.action ?? row.label;
  if (id == null) return null;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : String(id),
    at:
      typeof row.at === 'string'
        ? row.at
        : typeof row.date === 'string'
          ? row.date
          : typeof row.timestamp === 'string'
            ? row.timestamp
            : undefined,
    date: typeof row.date === 'string' ? row.date : undefined,
    action: typeof row.action === 'string' ? row.action : undefined,
    label: typeof row.label === 'string' ? row.label : undefined,
    user: row.user as CashSessionAuditEvent['user'],
    note: typeof row.note === 'string' ? row.note : undefined,
    reason: typeof row.reason === 'string' ? row.reason : undefined,
  };
}

export function normalizeCashSession(raw: unknown): CashSession | null {
  const row = asRecord(raw);
  if (!row || row.id == null) return null;

  const summary = normalizeSummary(row.summary ?? row.balances ?? row.totals);
  const currency = currencyCode(row.currency ?? row.currency_code) ?? undefined;

  return {
    id: Number(row.id),
    number: typeof row.number === 'string' ? row.number : typeof row.name === 'string' ? row.name : undefined,
    name: typeof row.name === 'string' ? row.name : undefined,
    state: typeof row.state === 'string' ? row.state : undefined,
    state_label: typeof row.state_label === 'string' ? row.state_label : undefined,
    journal_id:
      typeof row.journal_id === 'number'
        ? row.journal_id
        : typeof (row.journal as { id?: number } | undefined)?.id === 'number'
          ? (row.journal as { id: number }).id
          : undefined,
    journal: row.journal as CashSession['journal'],
    cashier: row.cashier as CashSession['cashier'],
    cashier_name:
      typeof row.cashier_name === 'string' ? row.cashier_name : refName(row.cashier as never) ?? undefined,
    school: row.school as CashSession['school'],
    school_id: typeof row.school_id === 'number' ? row.school_id : undefined,
    currency,
    currency_code: currency,
    opening_balance:
      normalizeMoneyValue(row.opening_balance) ?? summary?.opening_balance ?? undefined,
    expected_balance:
      normalizeMoneyValue(row.expected_balance) ?? summary?.expected_balance ?? undefined,
    counted_balance: normalizeMoneyValue(row.counted_balance) ?? undefined,
    difference: normalizeMoneyValue(row.difference) ?? undefined,
    difference_reason: typeof row.difference_reason === 'string' ? row.difference_reason : undefined,
    closing_note: typeof row.closing_note === 'string' ? row.closing_note : undefined,
    opened_at:
      typeof row.opened_at === 'string'
        ? row.opened_at
        : typeof row.open_date === 'string'
          ? row.open_date
          : undefined,
    open_date: typeof row.open_date === 'string' ? row.open_date : undefined,
    closed_at:
      typeof row.closed_at === 'string'
        ? row.closed_at
        : typeof row.close_date === 'string'
          ? row.close_date
          : undefined,
    close_date: typeof row.close_date === 'string' ? row.close_date : undefined,
    closed_by: row.closed_by as CashSession['closed_by'],
    reopen_count: typeof row.reopen_count === 'number' ? row.reopen_count : undefined,
    summary,
    collections: parseFinanceList<CashSessionCollectionRow>(row.collections)
      .map(normalizeCollectionRow)
      .filter(Boolean) as CashSessionCollectionRow[],
    receipts: parseFinanceList<CashSessionReceiptRow>(row.receipts)
      .map(normalizeReceiptRow)
      .filter(Boolean) as CashSessionReceiptRow[],
    movements: parseFinanceList<CashSessionMovement>(row.movements)
      .map(normalizeMovement)
      .filter(Boolean) as CashSessionMovement[],
    timeline: parseFinanceList<CashSessionAuditEvent>(row.timeline ?? row.audit_events)
      .map(normalizeAuditEvent)
      .filter(Boolean) as CashSessionAuditEvent[],
    audit_events: parseFinanceList<CashSessionAuditEvent>(row.audit_events)
      .map(normalizeAuditEvent)
      .filter(Boolean) as CashSessionAuditEvent[],
    allowed_actions: Array.isArray(row.allowed_actions)
      ? (row.allowed_actions.filter((a) => typeof a === 'string') as CashSessionAction[])
      : undefined,
  };
}

export function normalizeCurrentCashSession(data: unknown): CashSession | null {
  if (!data) return null;
  if (Array.isArray(data)) return null;
  const row = asRecord(data);
  if (!row) return null;
  if (row.session === null) return null;
  if (row.session != null) return normalizeCashSession(row.session);
  return normalizeCashSession(row);
}

export function parseCashSessionList(data: unknown, meta?: unknown): CashSessionListResult {
  const items = parseFinanceList<unknown>(data)
    .map(normalizeCashSession)
    .filter(Boolean) as CashSession[];
  const metaRow = asRecord(meta);
  const pagination =
    normalizePagination(metaRow?.pagination ?? metaRow) ??
    normalizePagination(asRecord(data)?.meta ?? data);
  return { items, pagination };
}

export function cashSessionAllowsAction(
  session: CashSession | null | undefined,
  action: CashSessionAction,
): boolean {
  return !!session?.allowed_actions?.includes(action);
}

export function cashSessionDisplayNumber(session: CashSession): string {
  return session.number?.trim() || session.name?.trim() || `#${session.id}`;
}

export function cashSessionJournalLabel(session: CashSession): string | null {
  return refName(session.journal)?.trim() || null;
}

export function cashSessionIsActive(state: string | undefined | null): boolean {
  return state === 'open' || state === 'reopened';
}

export function cashSessionIsClosing(state: string | undefined | null): boolean {
  return state === 'closing';
}

export function cashSessionIsClosed(state: string | undefined | null): boolean {
  return state === 'closed';
}

export function previewCashDifference(counted: number | null, expected: number | null): number | null {
  if (counted == null || expected == null) return null;
  return counted - expected;
}

export function buildCashSessionClosureFilename(session: CashSession, lang: 'ar' | 'fr'): string {
  const num = cashSessionDisplayNumber(session).replace(/[^\w.-]+/g, '-');
  return `cash-session-${num}-${lang}.pdf`;
}

export type { CashSessionCurrentResponse, Pagination };
