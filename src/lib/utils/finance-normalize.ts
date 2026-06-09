import type { Pagination } from '@/types/api';

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
  for (const key of ['items', 'results', 'children', 'students', 'data']) {
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
