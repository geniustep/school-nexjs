import type { FamilyOpenInstallment } from '@/types/family-finance';
import { sortInstallmentsForFamilySuggestion } from '@/features/admin/finance/family-suggested-allocation-utils';

export type FamilyDueRow = FamilyOpenInstallment & {
  remainingDue: number;
  allocatedNow: number;
};

/** Display backend open installments and allocation inputs without altering financial truth. */
export function buildFamilyDueRows(
  installments: FamilyOpenInstallment[],
  allocationInputs: Record<number, string>,
): FamilyDueRow[] {
  return sortInstallmentsForFamilySuggestion(installments)
    .filter((row) => Number.isFinite(row.remaining_amount) && (row.remaining_amount ?? 0) > 0)
    .map((row) => {
      const raw = Number.parseFloat((allocationInputs[row.installment_id] ?? '').replace(',', '.'));
      return {
        ...row,
        remainingDue: row.remaining_amount ?? 0,
        allocatedNow: Number.isFinite(raw) && raw > 0 ? raw : 0,
      };
    });
}

/** Format date-only Odoo values without timezone conversion. */
export function formatFamilyDueDate(value?: string | null): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
