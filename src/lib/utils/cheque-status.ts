import type { ChequeState } from '@/types/finance';

export type ChequeStatusBucket = ChequeState;

/** Canonical quick-filter value for rejected/bounced cheques in URLs. */
export const CHEQUE_QUICK_REJECTED = 'rejected' as const;

const REJECTED_ALIASES = new Set(['rejected', 'bounced', 'returned', 'returned_to_payer']);

/** Normalize lifecycle/API cheque states into admin list buckets. */
export function normalizeChequeStatus(state: string | undefined | null): ChequeStatusBucket | string {
  const raw = (state ?? 'received').toLowerCase();
  if (REJECTED_ALIASES.has(raw)) return 'rejected';
  return raw;
}

export function getChequeStatusLabelKey(state: string | undefined | null): string {
  const bucket = normalizeChequeStatus(state);
  return `admin.finance.cheques.states.${bucket}`;
}

export function getChequeStatusBucket(state: string | undefined | null): ChequeStatusBucket | string {
  return normalizeChequeStatus(state);
}

export function isRejectedCheque(state: string | undefined | null): boolean {
  return normalizeChequeStatus(state) === 'rejected';
}

/** API state values that represent rejected/bounced cheques in list filters. */
export function rejectedChequeApiStates(): Array<'rejected' | 'bounced'> {
  return ['rejected', 'bounced'];
}

export function totalRejectedChequeCount(
  rejectedCount: number | null | undefined,
  bouncedCount: number | null | undefined,
): number {
  return (rejectedCount ?? 0) + (bouncedCount ?? 0);
}

/** Pick list filter state when rejected records may be stored as bounced. */
export function rejectedChequeListApiState(
  rejectedCount: number | null | undefined,
  bouncedCount: number | null | undefined,
): 'rejected' | 'bounced' {
  if ((rejectedCount ?? 0) > 0) return 'rejected';
  if ((bouncedCount ?? 0) > 0) return 'bounced';
  return 'rejected';
}

export function rejectedChequeQuickHref(): string {
  return `/admin/finance/cheques?quick=${CHEQUE_QUICK_REJECTED}`;
}
