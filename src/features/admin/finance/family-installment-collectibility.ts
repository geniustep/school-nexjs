import type { FamilyOpenInstallment } from '@/types/family-finance';

/** Backend `open_installments[].collectible` — same rule across allocation paths. */
export function isInstallmentCollectibleForAllocation(
  row: FamilyOpenInstallment,
): boolean {
  if (row.collectible === false) return false;
  const remaining = row.remaining_amount ?? 0;
  return remaining > 0;
}

export function filterCollectibleFamilyInstallments(
  installments: FamilyOpenInstallment[],
): FamilyOpenInstallment[] {
  return installments.filter(isInstallmentCollectibleForAllocation);
}
