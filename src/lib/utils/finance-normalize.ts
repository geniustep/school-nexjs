import type { Pagination } from '@/types/api';
import type { AdminFinanceOverview, FinanceOverviewTotals, PaymentJournal } from '@/types/finance';
import { currencyCode } from '@/lib/utils/finance';

/** Coerce API money fields that may arrive as string or number. */
export function normalizeMoneyValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Parse list payloads whether the envelope uses a bare array or nested keys. */
export function parseFinanceList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  for (const key of ['options', 'items', 'results', 'children', 'students', 'data']) {
    if (Array.isArray(o[key])) return o[key] as T[];
  }
  return [];
}

export function normalizePagination(meta: unknown): Pagination | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as Record<string, unknown>;
  const pg = (m.pagination ?? m) as Record<string, unknown>;
  const page = Number(pg.page);
  const page_size = Number(pg.page_size ?? pg.limit ?? pg.per_page);
  const total = Number(pg.total ?? pg.count);
  const total_pages = Number(pg.total_pages ?? pg.pages);
  if (!page || !total_pages) return null;
  return {
    page,
    page_size: page_size || 20,
    total: total || 0,
    total_pages,
  };
}

/** Map flat overview payloads and legacy nested totals into one shape. */
function enrichOverviewTotals(
  nested: FinanceOverviewTotals,
  raw: Record<string, unknown>,
): FinanceOverviewTotals {
  const confirmedPaid =
    normalizeMoneyValue(nested.confirmed_paid) ?? normalizeMoneyValue(raw.confirmed_paid);
  const totalPaid =
    normalizeMoneyValue(nested.total_paid) ?? confirmedPaid ?? normalizeMoneyValue(raw.total_paid);
  const totalCollected =
    normalizeMoneyValue(nested.total_collected) ??
    confirmedPaid ??
    totalPaid ??
    normalizeMoneyValue(raw.total_collected);

  return {
    ...nested,
    confirmed_paid: confirmedPaid ?? undefined,
    total_paid: totalPaid ?? undefined,
    total_collected: totalCollected ?? undefined,
  };
}

export function normalizeFinanceOverview(data: AdminFinanceOverview | null | undefined): AdminFinanceOverview | null {
  if (!data) return null;
  const raw = data as AdminFinanceOverview & FinanceOverviewTotals & Record<string, unknown>;
  const nested = raw.totals ?? raw.summary;
  if (nested && typeof nested === 'object') {
    return {
      ...raw,
      totals: enrichOverviewTotals(nested as FinanceOverviewTotals, raw),
      recent_collections: raw.recent_collections,
      followup_students: raw.followup_students ?? raw.students_needing_followup,
      upcoming_installments: raw.upcoming_installments as AdminFinanceOverview['upcoming_installments'],
      overdue_installments: raw.overdue_installments as AdminFinanceOverview['overdue_installments'],
      as_of_date: typeof raw.as_of_date === 'string' ? raw.as_of_date : undefined,
    };
  }

  const cheques = (raw.cheques ?? {}) as Record<string, unknown>;
  const totals: FinanceOverviewTotals = {
    total_due: raw.total_due,
    total_collected: raw.total_collected ?? raw.confirmed_paid ?? raw.total_paid,
    confirmed_paid: raw.confirmed_paid ?? raw.total_paid ?? raw.total_collected,
    total_paid: raw.total_paid ?? raw.confirmed_paid ?? raw.total_collected,
    total_remaining: raw.total_remaining ?? raw.remaining_amount,
    total_overdue: raw.total_overdue ?? raw.overdue_amount,
    students_with_balance: raw.students_with_balance,
    overdue_installments_count: raw.overdue_installments_count ?? raw.overdue_installments,
    cheques_pending_amount: raw.cheques_pending_amount ?? raw.pending_cheques,
    cheques_due_amount: raw.cheques_due_amount,
    cheques_deposited_amount: raw.cheques_deposited_amount,
    cheques_cleared_amount: raw.cheques_cleared_amount,
    cheques_rejected_amount: raw.cheques_rejected_amount,
    cheques_pending_count: raw.cheques_pending_count ?? (cheques.received as number | undefined),
    cheques_due_count: raw.cheques_due_count,
    cheques_deposited_count: raw.cheques_deposited_count ?? (cheques.deposited as number | undefined),
    cheques_cleared_count: raw.cheques_cleared_count ?? (cheques.cleared as number | undefined),
    cheques_rejected_count:
      raw.cheques_rejected_count ?? (cheques.bounced as number | undefined) ?? (cheques.rejected as number | undefined),
    uncovered_amount: raw.uncovered_amount,
    draft_agreements_count: raw.draft_agreements_count,
    active_agreements_count: raw.active_agreements_count,
    currency: raw.currency,
  };

  return {
    ...raw,
    totals,
    recent_collections: raw.recent_collections,
    followup_students: raw.followup_students ?? raw.students_needing_followup,
    upcoming_installments: raw.upcoming_installments as AdminFinanceOverview['upcoming_installments'],
    overdue_installments: raw.overdue_installments as AdminFinanceOverview['overdue_installments'],
    as_of_date: typeof raw.as_of_date === 'string' ? raw.as_of_date : undefined,
  };
}

export function journalErrorMessageKey(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_journal':
      return 'admin.finance.errors.invalidJournal';
    case 'journal_inactive':
      return 'admin.finance.errors.journalInactive';
    case 'journal_not_allowed':
      return 'admin.finance.errors.journalNotAllowed';
    case 'journal_company_mismatch':
      return 'admin.finance.errors.journalCompanyMismatch';
    default:
      return null;
  }
}

/** Coerce journal payment method entries from string or `{ code, name }` API shapes. */
export function normalizePaymentMethodCode(method: unknown): string {
  if (!method) return '';
  if (typeof method === 'string') return method;
  if (typeof method === 'object') {
    const row = method as Record<string, unknown>;
    const code = row.code ?? row.value ?? row.id;
    if (typeof code === 'string') return code;
    if (code != null) return String(code);
    if (typeof row.name === 'string') return row.name;
  }
  return String(method);
}

export function normalizePaymentJournal(journal: PaymentJournal): PaymentJournal {
  const currency = currencyCode(journal.currency ?? journal.currency_code) ?? undefined;
  const methods = normalizePaymentMethodOptions(journal.allowed_payment_methods).map((m) =>
    m.label ? { code: m.code, name: m.label } : m.code,
  );
  return {
    ...journal,
    currency,
    currency_code: currency,
    allowed_payment_methods: methods as PaymentJournal['allowed_payment_methods'],
  };
}

export function normalizePaymentMethodOptions(
  methods: unknown[] | null | undefined,
): { code: string; label?: string }[] {
  if (!methods?.length) return [];
  const out: { code: string; label?: string }[] = [];
  const seen = new Set<string>();
  for (const raw of methods) {
    const code = normalizePaymentMethodCode(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const label =
      typeof raw === 'object' && raw
        ? (['label', 'name'] as const)
            .map((key) => (raw as Record<string, unknown>)[key])
            .find((v) => typeof v === 'string')
        : undefined;
    out.push({ code, label: typeof label === 'string' ? label : undefined });
  }
  return out;
}
