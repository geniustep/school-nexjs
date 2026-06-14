import type { StudentInstallment } from '@/features/admin/student-finance/types';

export type AllocationLineInput = {
  installment_id: number;
  student_fee_id?: number;
  amount: number;
};

const TIMING_PRIORITY: Record<string, number> = {
  overdue: 0,
  due: 1,
  upcoming: 2,
  hidden: 3,
  not_applicable: 4,
};

export function canAllocateToInstallment(installment: StudentInstallment): boolean {
  if ((installment.remaining_amount ?? 0) <= 0) return false;
  if (installment.payment_status === 'paid') return false;
  if (installment.allow_early_payment === false) {
    const timing = installment.timing_status ?? 'not_applicable';
    if (timing === 'upcoming' || timing === 'hidden') return false;
  }
  return true;
}

export function sortInstallmentsForAllocation(rows: StudentInstallment[]): StudentInstallment[] {
  return [...rows].sort((a, b) => {
    const ta = TIMING_PRIORITY[a.timing_status ?? 'not_applicable'] ?? 9;
    const tb = TIMING_PRIORITY[b.timing_status ?? 'not_applicable'] ?? 9;
    if (ta !== tb) return ta - tb;
    const da = a.due_date ?? '';
    const db = b.due_date ?? '';
    if (da !== db) return da.localeCompare(db);
    return (a.sequence ?? a.id) - (b.sequence ?? b.id);
  });
}

export function autoAllocateOldest(
  installments: StudentInstallment[],
  totalAmount: number,
): Record<number, string> {
  const result: Record<number, string> = {};
  let remaining = totalAmount;
  if (!isPositiveAmount(totalAmount)) return result;

  for (const row of sortInstallmentsForAllocation(installments)) {
    if (!canAllocateToInstallment(row)) continue;
    if (remaining <= 0) break;
    const cap = Math.min(row.remaining_amount ?? 0, remaining);
    if (cap <= 0) continue;
    result[row.id] = formatAmount(cap);
    remaining = roundMoney(remaining - cap);
  }
  return result;
}

export function sumAllocationAmounts(values: Record<number, string>): number {
  return Object.values(values).reduce((sum, raw) => sum + (Number(raw) || 0), 0);
}

export function buildAllocationPayload(
  values: Record<number, string>,
  installments: StudentInstallment[],
): AllocationLineInput[] {
  const byId = new Map(installments.map((row) => [row.id, row]));
  const lines: AllocationLineInput[] = [];
  for (const [idRaw, amountRaw] of Object.entries(values)) {
    const amount = Number(amountRaw);
    if (!isPositiveAmount(amount)) continue;
    const installmentId = Number(idRaw);
    const row = byId.get(installmentId);
    lines.push({
      installment_id: installmentId,
      student_fee_id: row?.fee_id ?? undefined,
      amount,
    });
  }
  return lines;
}

export function validateAllocationTotals(input: {
  collectionAmount: number;
  allocatedAmount: number;
  lines: AllocationLineInput[];
  installments: StudentInstallment[];
}): string | null {
  if (!isPositiveAmount(input.collectionAmount)) return 'invalidAmount';
  if (input.allocatedAmount - input.collectionAmount > 0.0001) return 'allocationExceedsCollection';
  const byId = new Map(input.installments.map((row) => [row.id, row]));
  for (const line of input.lines) {
    const row = byId.get(line.installment_id);
    if (!row) return 'invalidAllocation';
    if (!canAllocateToInstallment(row) && line.amount > 0) return 'earlyPaymentNotAllowed';
    if (line.amount - (row.remaining_amount ?? 0) > 0.0001) return 'allocationExceedsReceivable';
  }
  return null;
}

function isPositiveAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatAmount(value: number): string {
  return roundMoney(value).toFixed(2);
}
