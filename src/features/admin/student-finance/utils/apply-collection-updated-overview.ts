import type {
  CollectionUpdatedOverview,
  StudentFinancialOverview,
} from '@/types/student-financial-overview';
import { normalizeNextInstallment } from './normalize-student-financial-overview';

/** Merge POST collection `updated_overview` into cached financial overview. */
export function applyCollectionUpdatedOverview(
  current: StudentFinancialOverview,
  patch: CollectionUpdatedOverview,
): StudentFinancialOverview {
  const nextInstallment =
    patch.next_installment === undefined
      ? current.next_installment
      : patch.next_installment === null
        ? null
        : normalizeNextInstallment(patch.next_installment);

  return {
    ...current,
    totals: {
      ...current.totals,
      ...patch.totals,
      currency: patch.totals.currency ?? current.totals.currency,
    },
    counts: patch.counts ? { ...current.counts, ...patch.counts } : current.counts,
    next_installment: nextInstallment,
  };
}
