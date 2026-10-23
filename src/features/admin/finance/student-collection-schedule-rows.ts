import type { StudentInstallment } from '@/features/admin/student-finance/types';
import { canAllocateToInstallment } from './collection-allocation-utils';

/** The schedule is for historical display; only Odoo's collectible list may be selected. */
export function isStudentCollectionRowSelectable(
  installment: StudentInstallment,
  eligibleInstallmentIds?: number[],
): boolean {
  return canAllocateToInstallment(installment) &&
    (eligibleInstallmentIds == null || eligibleInstallmentIds.includes(installment.id));
}

/** Keep paid historical rows from the schedule and up-to-date open rows from collectible-items. */
export function buildStudentCollectionScheduleRows(
  historical: StudentInstallment[],
  collectible: StudentInstallment[],
): StudentInstallment[] {
  const byId = new Map<number, StudentInstallment>();
  for (const row of historical) byId.set(row.id, row);
  for (const row of collectible) {
    const previous = byId.get(row.id);
    byId.set(row.id, previous
      ? {
          ...previous,
          ...row,
          confirmed_paid_amount: previous.confirmed_paid_amount ?? row.confirmed_paid_amount,
        }
      : row);
  }
  return [...byId.values()];
}
