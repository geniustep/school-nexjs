import type { FamilyOpenInstallment } from '@/types/family-finance';
import { filterCollectibleFamilyInstallments } from '@/features/admin/finance/family-installment-collectibility';

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

  const eligible = filterCollectibleFamilyInstallments(installments);
  // Sort the proposal by calendar month first. Backend suggestion_order remains the
  // tie-breaker inside a month; it is not a cross-month grouping instruction.
  // Undated rows retain their backend order after dated installments.
  const byBackendPriority = sortInstallmentsForFamilySuggestion(eligible);
  const backendRank = new Map(byBackendPriority.map((row, index) => [row.installment_id, index]));
  const period = (row: FamilyOpenInstallment) => {
    const matched = /^(\\d{4})-(\\d{2})/.exec(row.due_date ?? '');
    return matched ? `${matched[1]}-${matched[2]}` : '9999-99';
  };
  const sorted = [...byBackendPriority].sort((left, right) => {
    const month = period(left).localeCompare(period(right));
    return month || (backendRank.get(left.installment_id)! - backendRank.get(right.installment_id)!);
  });
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
