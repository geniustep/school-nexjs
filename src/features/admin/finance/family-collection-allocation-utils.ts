import type {
  FamilyCollectionAllocationInput,
  FamilyOpenInstallment,
} from '@/types/family-finance';

export function parseFamilyAllocationInputs(
  values: Record<number, string>,
): FamilyCollectionAllocationInput[] {
  const lines: FamilyCollectionAllocationInput[] = [];
  for (const [installmentIdRaw, rawAmount] of Object.entries(values)) {
    const installment_id = Number(installmentIdRaw);
    const amount = Number(rawAmount);
    if (!Number.isFinite(installment_id) || installment_id <= 0) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    lines.push({ installment_id, amount });
  }
  return lines;
}

export function sumFamilyAllocationAmounts(
  values: Record<number, string>,
): number {
  return Object.values(values).reduce((sum, raw) => sum + (Number(raw) || 0), 0);
}

export function validateFamilyAllocations(input: {
  amount: number;
  values: Record<number, string>;
  installments: FamilyOpenInstallment[];
}): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return 'invalid_amount';

  const byInstallment = new Map<number, FamilyOpenInstallment>();
  for (const row of input.installments) {
    byInstallment.set(row.installment_id, row);
  }

  const lines = parseFamilyAllocationInputs(input.values);
  const seen = new Set<number>();
  for (const line of lines) {
    if (seen.has(line.installment_id)) return 'duplicate_allocation_target';
    seen.add(line.installment_id);
    const target = byInstallment.get(line.installment_id);
    if (!target) return 'duplicate_allocation_target';
    if (line.amount > (target.remaining_amount ?? 0)) return 'allocation_exceeds_remaining';
  }

  const allocated = lines.reduce((sum, line) => sum + line.amount, 0);
  if (allocated - input.amount > 0.0001) return 'allocation_exceeds_amount';
  return null;
}
