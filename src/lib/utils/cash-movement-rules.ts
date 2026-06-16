import type { CashMovementType } from '@/types/finance-cash-desk';

/** Movement types that require a reference per live Odoo contract. */
export const CASH_MOVEMENT_TYPES_REQUIRING_REFERENCE: readonly CashMovementType[] = [
  'bank_deposit',
  'cash_out_adjustment',
  'safe_transfer_out',
];

export function cashMovementRequiresReference(type: string | undefined | null): boolean {
  const code = (type ?? '').trim();
  return CASH_MOVEMENT_TYPES_REQUIRING_REFERENCE.includes(code as CashMovementType);
}
