import type { PaymentCollection } from '@/types/finance';

function readCollectionDate(row: PaymentCollection): string | null {
  return row.collection_date ?? row.payment_date ?? row.date ?? null;
}

function readTimestamp(row: PaymentCollection): number {
  const raw = readCollectionDate(row);
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? 0 : ts;
}

export function pickLatestRecentCollection(
  collections: PaymentCollection[] | null | undefined,
): PaymentCollection | null {
  if (!collections?.length) return null;
  return [...collections].sort((a, b) => readTimestamp(b) - readTimestamp(a))[0] ?? null;
}

export function readCollectionReceiptNumber(row: PaymentCollection): string | null {
  const direct = row.receipt_number?.trim();
  if (direct) return direct;
  const receipt = row.receipt as { number?: string; receipt_number?: string | null } | null | undefined;
  const nested = receipt?.number ?? receipt?.receipt_number;
  return typeof nested === 'string' && nested.trim() ? nested.trim() : null;
}
