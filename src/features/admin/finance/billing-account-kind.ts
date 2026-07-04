import type { BillingAccountListItem } from '@/types/finance-billing-account';

/** Matches Odoo billing-accounts `account_kind` values. */
export type BillingAccountKind = 'family' | 'individual' | 'empty';

export type BillingAccountKindFilter = 'all' | BillingAccountKind;

const ACCOUNT_KINDS: BillingAccountKind[] = ['family', 'individual', 'empty'];

export function normalizeApiAccountKind(raw: unknown): BillingAccountKind | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (value === 'no_students') return 'empty';
  return ACCOUNT_KINDS.includes(value as BillingAccountKind) ? (value as BillingAccountKind) : null;
}

export function resolveBillingAccountKind(
  studentCount: number | null | undefined,
): BillingAccountKind {
  const count = studentCount ?? 0;
  if (count > 1) return 'family';
  if (count === 1) return 'individual';
  return 'empty';
}

export function resolveBillingAccountKindFromRow(
  row: Pick<BillingAccountListItem, 'account_kind' | 'student_count'>,
): BillingAccountKind {
  return normalizeApiAccountKind(row.account_kind) ?? resolveBillingAccountKind(row.student_count);
}

export function parseAccountKindUrlParam(raw: string | null): BillingAccountKindFilter {
  if (!raw) return 'all';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'all') return 'all';
  if (normalized === 'no_students') return 'empty';
  const kind = normalizeApiAccountKind(normalized);
  return kind ?? 'all';
}

/** Maps UI filter to Odoo query param; omits `all`. */
export function accountKindFilterToApiParam(
  filter: BillingAccountKindFilter,
): string | undefined {
  if (filter === 'all') return undefined;
  return filter;
}

export function billingAccountKindLabelKey(kind: BillingAccountKind): string {
  const map: Record<BillingAccountKind, string> = {
    family: 'admin.finance.billingAccounts.kind.family',
    individual: 'admin.finance.billingAccounts.kind.individual',
    empty: 'admin.finance.billingAccounts.kind.noStudents',
  };
  return map[kind];
}

export function billingAccountKindBadgeClass(kind: BillingAccountKind): string {
  const map: Record<BillingAccountKind, string> = {
    family: 'finance-billing-kind-badge finance-billing-kind-badge--family',
    individual: 'finance-billing-kind-badge finance-billing-kind-badge--individual',
    empty: 'finance-billing-kind-badge finance-billing-kind-badge--empty',
  };
  return map[kind];
}
