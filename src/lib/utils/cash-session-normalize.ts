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

function actionValueTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'number') return value > 0;
  return false;
}

function normalizeCashSessionAllowedActions(raw: unknown): CashSessionAction[] | undefined {
  if (Array.isArray(raw)) {
    const actions = raw.filter((item) => typeof item === 'string') as CashSessionAction[];
    return actions.length ? actions : undefined;
  }
  const map = asRecord(raw);
  if (!map) return undefined;
  const actions = Object.entries(map)
    .filter(([, value]) => actionValueTruthy(value))
    .map(([key]) => key as CashSessionAction);
  return actions.length ? actions : undefined;
}

function normalizeCashSessionId(row: Record<string, unknown>): number | null {
  const rawId = row.id ?? row.session_id;
  if (rawId == null) return null;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSummary(raw: unknown, row?: Record<string, unknown>): CashSessionSummary | undefined {
  const summaryRow = asRecord(raw);
  const base: CashSessionSummary = summaryRow
    ? {
        opening_balance: normalizeMoneyValue(summaryRow.opening_balance) ?? undefined,
        cash_collections_total:
          normalizeMoneyValue(summaryRow.cash_collections_total ?? summaryRow.confirmed_cash_collections) ??
          undefined,
        movements_in_total:
          normalizeMoneyValue(
            summaryRow.movements_in_total ?? summaryRow.total_cash_in ?? summaryRow.cash_in_total,
          ) ?? undefined,
        movements_out_total:
          normalizeMoneyValue(
            summaryRow.movements_out_total ?? summaryRow.total_cash_out ?? summaryRow.cash_out_total,
          ) ?? undefined,
        expected_balance: normalizeMoneyValue(summaryRow.expected_balance) ?? undefined,
        collections_count:
          typeof summaryRow.collections_count === 'number'
            ? summaryRow.collections_count
            : typeof summaryRow.cash_collections_count === 'number'
              ? summaryRow.cash_collections_count
              : undefined,
        receipts_count:
          typeof summaryRow.receipts_count === 'number' ? summaryRow.receipts_count : undefined,
        total_cash_in: normalizeMoneyValue(summaryRow.total_cash_in) ?? undefined,
        total_cash_out: normalizeMoneyValue(summaryRow.total_cash_out) ?? undefined,
      }
    : {};

  if (row) {
    const mov = asRecord(row.movements_summary);
    const coll = asRecord(row.collections_summary);
    const rcpt = asRecord(row.receipts_summary);
    if (mov) {
      base.movements_in_total =
        normalizeMoneyValue(mov.in_total) ?? base.movements_in_total;
      base.movements_out_total =
        normalizeMoneyValue(mov.out_total) ?? base.movements_out_total;
    }
    if (coll) {
      base.collections_count =
        typeof coll.count === 'number' ? coll.count : base.collections_count;
      base.cash_collections_total =
        normalizeMoneyValue(coll.total) ?? base.cash_collections_total;
    }
    if (rcpt) {
      base.receipts_count = typeof rcpt.count === 'number' ? rcpt.count : base.receipts_count;
    }
    if (row.opening_balance != null && base.opening_balance == null) {
      base.opening_balance = normalizeMoneyValue(row.opening_balance) ?? undefined;
    }
    if (row.expected_balance != null && base.expected_balance == null) {
      base.expected_balance = normalizeMoneyValue(row.expected_balance) ?? undefined;
    }
  }

  return Object.keys(base).length ? base : undefined;
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
    reference:
      typeof row.reference === 'string' && row.reference.trim()
        ? row.reference
        : undefined,
    direction: typeof row.direction === 'string' ? row.direction : undefined,
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

function normalizeAuditEvent(raw: unknown, index: number): CashSessionAuditEvent | null {
  const row = asRecord(raw);
  if (!row) return null;
  const action = typeof row.action === 'string' ? row.action : undefined;
  const eventAt =
    typeof row.at === 'string'
      ? row.at
      : typeof row.event_at === 'string'
        ? row.event_at
        : typeof row.date === 'string'
          ? row.date
          : typeof row.timestamp === 'string'
            ? row.timestamp
            : undefined;
  const rawId = row.id;
  const id =
    rawId != null
      ? typeof rawId === 'string' || typeof rawId === 'number'
        ? rawId
        : String(rawId)
      : action && eventAt
        ? `${action}-${eventAt}-${index}`
        : action
          ? `${action}-${index}`
          : null;
  if (id == null) return null;
  return {
    id,
    at: eventAt,
    date: typeof row.date === 'string' ? row.date : undefined,
    action: typeof row.action === 'string' ? row.action : undefined,
    label: typeof row.label === 'string' ? row.label : undefined,
    user:
      typeof row.user === 'string'
        ? ({ name: row.user } as CashSessionAuditEvent['user'])
        : (row.user as CashSessionAuditEvent['user']),
    note: typeof row.note === 'string' ? row.note : undefined,
    reason: typeof row.reason === 'string' ? row.reason : undefined,
    state_before: typeof row.state_before === 'string' ? row.state_before : undefined,
    state_after: typeof row.state_after === 'string' ? row.state_after : undefined,
  };
}

export function normalizeCashSession(raw: unknown): CashSession | null {
  const row = asRecord(raw);
  if (!row) return null;
  if (row.session && typeof row.session === 'object') {
    return normalizeCashSession(row.session);
  }
  const sessionId = normalizeCashSessionId(row);
  if (sessionId == null) return null;

  const summary = normalizeSummary(row.summary ?? row.balances ?? row.totals, row);
  const currency = currencyCode(row.currency ?? row.currency_code) ?? undefined;
  const journalName = typeof row.journal_name === 'string' ? row.journal_name : undefined;
  const schoolName = typeof row.school_name === 'string' ? row.school_name : undefined;

  return {
    id: sessionId,
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
    journal:
      (row.journal as CashSession['journal']) ??
      (journalName ? { id: row.journal_id as number, name: journalName } : undefined),
    cashier: row.cashier as CashSession['cashier'],
    cashier_id:
      typeof row.cashier_id === 'number'
        ? row.cashier_id
        : typeof (row.cashier as { id?: number } | undefined)?.id === 'number'
          ? (row.cashier as { id: number }).id
          : undefined,
    cashier_name:
      typeof row.cashier_name === 'string' ? row.cashier_name : refName(row.cashier as never) ?? undefined,
    school:
      (row.school as CashSession['school']) ??
      (schoolName ? { id: row.school_id as number, name: schoolName } : undefined),
    school_id: typeof row.school_id === 'number' ? row.school_id : undefined,
    currency,
    currency_code: currency,
    opening_balance:
      normalizeMoneyValue(row.opening_balance) ?? summary?.opening_balance ?? undefined,
    expected_balance:
      normalizeMoneyValue(row.expected_balance) ?? summary?.expected_balance ?? undefined,
    counted_balance: normalizeMoneyValue(row.counted_balance) ?? undefined,
    difference: normalizeMoneyValue(row.difference ?? row.difference_amount) ?? undefined,
    difference_reason:
      typeof row.difference_reason === 'string' ? row.difference_reason : undefined,
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
    timeline: parseFinanceList<CashSessionAuditEvent>(row.timeline ?? row.audit ?? row.audit_events)
      .map((item, index) => normalizeAuditEvent(item, index))
      .filter(Boolean) as CashSessionAuditEvent[],
    audit_events: parseFinanceList<CashSessionAuditEvent>(row.audit_events ?? row.audit)
      .map((item, index) => normalizeAuditEvent(item, index))
      .filter(Boolean) as CashSessionAuditEvent[],
    allowed_actions: normalizeCashSessionAllowedActions(row.allowed_actions),
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
