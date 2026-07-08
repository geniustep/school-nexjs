import type { FamilyOpenInstallment } from '@/types/family-finance';

/** Sort open installments for suggestion using backend `suggestion_order` when present. */
export function sortInstallmentsForFamilySuggestion(
  installments: FamilyOpenInstallment[],
): FamilyOpenInstallment[] {
  const indexed = installments.map((row, index) => ({ row, index }));
  const hasSuggestionOrder = indexed.some(
    ({ row }) => row.suggestion_order != null && Number.isFinite(row.suggestion_order),
  );

  if (!hasSuggestionOrder) {
    return [...installments];
  }

  return [...indexed]
    .sort((a, b) => {
      const sa = a.row.suggestion_order ?? Number.MAX_SAFE_INTEGER;
      const sb = b.row.suggestion_order ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      if (a.index !== b.index) return a.index - b.index;
      return a.row.installment_id - b.row.installment_id;
    })
    .map(({ row }) => row);
}

/** Build a greedy allocation suggestion from backend installment order — manual edits stay separate. */
export function buildSuggestedFamilyAllocations(input: {
  amount: number;
  installments: FamilyOpenInstallment[];
}): Record<number, string> {
  const { amount, installments } = input;
  if (!Number.isFinite(amount) || amount <= 0 || installments.length === 0) {
    return {};
  }

  const sorted = sortInstallmentsForFamilySuggestion(installments);
  let remaining = amount;
  const values: Record<number, string> = {};

  for (const row of sorted) {
    if (remaining <= 0) break;
    const due = row.remaining_amount ?? 0;
    if (due <= 0) continue;
    const allocated = Math.min(remaining, due);
    values[row.installment_id] = String(allocated);
    remaining -= allocated;
  }

  return values;
}
