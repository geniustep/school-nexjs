import type { StudentInstallment } from '@/features/admin/student-finance/types';
import { autoAllocateOldest } from './collection-allocation-utils';

/** UI-only proposal. Only the backend preview can authorize a collection. */
export function deriveStudentMonthlyAllocation(amount: string, installments: StudentInstallment[]): {
  allocations: Record<number, string>;
  selectedIds: number[];
} {
  const parsed = Number(amount.replace(',', '.'));
  const allocations = Number.isFinite(parsed) && parsed > 0 ? autoAllocateOldest(installments, parsed) : {};
  return { allocations, selectedIds: Object.keys(allocations).map(Number) };
}

export type MonthPaymentProgress = {
  available: boolean;
  confirmedPercent: number;
  proposedPercent: number;
  afterPercent: number;
};

/** Percent of confirmed historical payments plus separately marked draft allocation. */
export function calculateMonthPaymentProgress(
  installments: StudentInstallment[],
  allocations: Record<number, string>,
): MonthPaymentProgress {
  if (!installments.length) return { available: false, confirmedPercent: 0, proposedPercent: 0, afterPercent: 0 };
  let confirmed = 0;
  let remaining = 0;
  let proposed = 0;
  for (const row of installments) {
    const paid = row.confirmed_paid_amount;
    const due = row.remaining_amount;
    if (typeof paid !== 'number' || !Number.isFinite(paid) || paid < 0 ||
        typeof due !== 'number' || !Number.isFinite(due) || due < 0) {
      return { available: false, confirmedPercent: 0, proposedPercent: 0, afterPercent: 0 };
    }
    const raw = Number((allocations[row.id] ?? '').replace(',', '.'));
    confirmed += paid;
    remaining += due;
    proposed += Number.isFinite(raw) && raw > 0 ? Math.min(due, raw) : 0;
  }
  const basis = confirmed + remaining;
  if (basis <= 0) return { available: false, confirmedPercent: 0, proposedPercent: 0, afterPercent: 0 };
  const confirmedPercent = Math.min(100, Math.max(0, confirmed / basis * 100));
  const proposedPercent = Math.min(100 - confirmedPercent, Math.max(0, proposed / basis * 100));
  return { available: true, confirmedPercent, proposedPercent, afterPercent: Math.round(confirmedPercent + proposedPercent) };
}
