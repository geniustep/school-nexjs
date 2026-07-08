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

export function parseAllocationAmount(value: string | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function sumFamilyAllocationAmounts(
  values: Record<number, string>,
): number {
  return Object.values(values).reduce((sum, raw) => sum + (Number(raw) || 0), 0);
}

export function computeFamilyAvailableAmount(
  collectionAmount: number,
  values: Record<number, string>,
  excludeInstallmentId?: number,
): number {
  let allocated = 0;
  for (const [idRaw, raw] of Object.entries(values)) {
    const installmentId = Number(idRaw);
    if (excludeInstallmentId != null && installmentId === excludeInstallmentId) continue;
    allocated += Number(raw) || 0;
  }
  return Math.max(0, collectionAmount - allocated);
}

export function fillInstallmentAllocation(
  installment: FamilyOpenInstallment,
  collectionAmount: number,
  values: Record<number, string>,
): Record<number, string> {
  const available = computeFamilyAvailableAmount(
    collectionAmount,
    values,
    installment.installment_id,
  );
  const remaining = installment.remaining_amount ?? 0;
  const fill = Math.min(remaining, available);
  if (fill <= 0) {
    const next = { ...values };
    delete next[installment.installment_id];
    return next;
  }
  return { ...values, [installment.installment_id]: String(fill) };
}

export function clearInstallmentAllocation(
  values: Record<number, string>,
  installmentId: number,
): Record<number, string> {
  const next = { ...values };
  delete next[installmentId];
  return next;
}

/** Distributes remaining collection amount across one child's rows in list order (explicit user action). */
export function allocateAvailableToChild(
  childInstallments: FamilyOpenInstallment[],
  collectionAmount: number,
  values: Record<number, string>,
): Record<number, string> {
  let available = computeFamilyAvailableAmount(collectionAmount, values);
  const next = { ...values };
  for (const row of childInstallments) {
    if (available <= 0) break;
    const remaining = row.remaining_amount ?? 0;
    if (remaining <= 0) continue;
    const fill = Math.min(remaining, available);
    next[row.installment_id] = String(fill);
    available -= fill;
  }
  return next;
}

export function computeChildOpenTotal(rows: FamilyOpenInstallment[]): number {
  return rows.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0);
}

export function computeChildAllocatedNow(
  rows: FamilyOpenInstallment[],
  values: Record<number, string>,
): number {
  return rows.reduce(
    (sum, row) => sum + parseAllocationAmount(values[row.installment_id]),
    0,
  );
}

export function computeChildRemainingAfter(openTotal: number, allocatedNow: number): number {
  return Math.max(0, openTotal - allocatedNow);
}

export function computeProjectedRemaining(
  remainingBefore: number,
  allocatedNow: number,
): number {
  return Math.max(0, remainingBefore - allocatedNow);
}

export type FamilyInstallmentFilter =
  | 'all'
  | 'unallocated'
  | 'registration'
  | 'tuition'
  | 'overdue';

export function matchesFamilyInstallmentFilter(
  row: FamilyOpenInstallment,
  filter: FamilyInstallmentFilter,
  values: Record<number, string>,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'unallocated':
      return parseAllocationAmount(values[row.installment_id]) <= 0;
    case 'registration':
      return row.service_type === 'registration';
    case 'tuition':
      return row.service_type === 'tuition';
    case 'overdue':
      return row.is_overdue === true;
    default:
      return true;
  }
}

export function familyServiceTypeBadgeClass(
  serviceType: string | null | undefined,
): string {
  const map: Record<string, string> = {
    registration: 'finance-family-fee-badge finance-family-fee-badge--registration',
    tuition: 'finance-family-fee-badge finance-family-fee-badge--tuition',
    transport: 'finance-family-fee-badge finance-family-fee-badge--transport',
    canteen: 'finance-family-fee-badge finance-family-fee-badge--canteen',
  };
  return map[serviceType ?? ''] ?? 'finance-family-fee-badge finance-family-fee-badge--other';
}

export function hasUnsavedFamilyCollectionChanges(input: {
  amount: string;
  values: Record<number, string>;
  draftId: number | null;
}): boolean {
  if (input.draftId != null) return false;
  const parsedAmount = Number.parseFloat(input.amount.replace(',', '.'));
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasAllocations = Object.values(input.values).some(
    (value) => parseAllocationAmount(value) > 0,
  );
  return hasAmount || hasAllocations;
}

export function countChildAllocatedLines(
  rows: FamilyOpenInstallment[],
  values: Record<number, string>,
): number {
  return rows.filter((row) => parseAllocationAmount(values[row.installment_id]) > 0).length;
}

export function hasActiveFamilyAllocations(values: Record<number, string>): boolean {
  return Object.values(values).some((value) => parseAllocationAmount(value) > 0);
}

export type SuggestionPriority = 1 | 2 | 3 | 4 | 5;

export function getSuggestionPriority(
  row: FamilyOpenInstallment,
  today: string,
): SuggestionPriority {
  const serviceType = row.service_type ?? '';

  if (serviceType === 'registration') return 1;

  const dueDate = row.due_date;
  if (dueDate && dueDate > today) return 5;

  if (row.is_overdue === true) return 2;

  if (serviceType === 'tuition') return 3;

  return 4;
}

export function compareSuggestionCandidates(
  a: FamilyOpenInstallment,
  b: FamilyOpenInstallment,
  today: string,
): number {
  const priorityDiff = getSuggestionPriority(a, today) - getSuggestionPriority(b, today);
  if (priorityDiff !== 0) return priorityDiff;

  const dueA = a.due_date ?? '9999-12-31';
  const dueB = b.due_date ?? '9999-12-31';
  const dueDiff = dueA.localeCompare(dueB);
  if (dueDiff !== 0) return dueDiff;

  return a.installment_id - b.installment_id;
}

/** Explicit user-triggered allocation suggestion — deterministic, reviewable, editable. */
export function buildSuggestedFamilyAllocations(
  installments: FamilyOpenInstallment[],
  collectionAmount: number,
  today: string = new Date().toISOString().slice(0, 10),
): Record<number, string> {
  if (!Number.isFinite(collectionAmount) || collectionAmount <= 0) return {};

  const eligible = installments.filter((row) => (row.remaining_amount ?? 0) > 0);
  const sorted = [...eligible].sort((a, b) => compareSuggestionCandidates(a, b, today));
  const current = sorted.filter((row) => getSuggestionPriority(row, today) < 5);
  const future = sorted.filter((row) => getSuggestionPriority(row, today) === 5);

  const values: Record<number, string> = {};
  let remainingCollectionAmount = collectionAmount;

  for (const row of current) {
    if (remainingCollectionAmount <= 0) break;
    const installmentRemaining = row.remaining_amount ?? 0;
    const allocation = Math.min(installmentRemaining, remainingCollectionAmount);
    if (allocation <= 0) continue;
    values[row.installment_id] = String(allocation);
    remainingCollectionAmount -= allocation;
  }

  if (remainingCollectionAmount > 0) {
    for (const row of future) {
      if (remainingCollectionAmount <= 0) break;
      const installmentRemaining = row.remaining_amount ?? 0;
      const allocation = Math.min(installmentRemaining, remainingCollectionAmount);
      if (allocation <= 0) continue;
      values[row.installment_id] = String(allocation);
      remainingCollectionAmount -= allocation;
    }
  }

  return values;
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
