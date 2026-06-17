import type {
  CollectionUpdatedOverview,
  StudentFinancialOverview,
  StudentFinancialOverviewTotals,
} from '@/types/student-financial-overview';
import { normalizeNextInstallment } from './normalize-student-financial-overview';

function mergeOverviewTotals(
  current: StudentFinancialOverviewTotals,
  patchTotals: CollectionUpdatedOverview['totals'],
): StudentFinancialOverviewTotals {
  if (!patchTotals || typeof patchTotals !== 'object') {
    return current;
  }
  return {
    ...current,
    ...patchTotals,
    currency: patchTotals.currency ?? current.currency,
  };
}

/** Merge POST collection `updated_overview` into cached financial overview. */
export function applyCollectionUpdatedOverview(
  current: StudentFinancialOverview,
  patch: CollectionUpdatedOverview,
): StudentFinancialOverview {
  if (!patch || typeof patch !== 'object') {
    return current;
  }

  const nextInstallment =
    patch.next_installment === undefined
      ? current.next_installment
      : patch.next_installment === null
        ? null
        : normalizeNextInstallment(patch.next_installment);

  return {
    ...current,
    totals: mergeOverviewTotals(current.totals, patch.totals),
    counts: patch.counts ? { ...current.counts, ...patch.counts } : current.counts,
    next_installment: nextInstallment,
  };
}
