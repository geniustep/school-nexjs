import type {
  FamilyCollectionAllocationInput,
  FamilyCollectionPreviewResponse,
  FamilyOpenInstallment,
} from '@/types/family-finance';

export type FamilyInstallmentFilter = 'all' | 'unallocated' | 'registration' | 'tuition' | 'overdue';

export type FamilyCollectionConfirmBlockReason =
  | 'not_in_review'
  | 'preview_missing'
  | 'preview_errors'
  | 'missing_fields'
  | 'cash_session_blocked'
  | 'invalid_amount';

export interface FamilyStudentAllocationSummary {
  studentId: number;
  studentName: string;
  classLabel: string;
  openTotal: number;
  allocatedNow: number;
  remainingAfter: number;
  allocatedItemCount: number;
  hasAllocations: boolean;
}

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

export function hasActiveFamilyAllocations(values: Record<number, string>): boolean {
  return parseFamilyAllocationInputs(values).length > 0;
}

export function installmentAllocationAmount(
  values: Record<number, string>,
  installmentId: number,
): number {
  const raw = values[installmentId];
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function filterFamilyInstallments(
  installments: FamilyOpenInstallment[],
  filter: FamilyInstallmentFilter,
  allocationInputs: Record<number, string>,
): FamilyOpenInstallment[] {
  if (filter === 'all') return installments;

  return installments.filter((row) => {
    if (filter === 'unallocated') {
      return installmentAllocationAmount(allocationInputs, row.installment_id) <= 0;
    }
    if (filter === 'registration') {
      return row.service_type === 'registration';
    }
    if (filter === 'tuition') {
      return row.service_type === 'tuition';
    }
    if (filter === 'overdue') {
      return row.is_overdue === true;
    }
    return true;
  });
}

function formatClassLevel(row: FamilyOpenInstallment): string {
  return [row.level_name, row.class_name, row.section_name].filter(Boolean).join(' — ');
}

export function buildFamilyStudentAllocationSummaries(input: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
  filteredInstallmentIds?: Set<number>;
}): FamilyStudentAllocationSummary[] {
  const grouped = new Map<number, FamilyOpenInstallment[]>();
  for (const row of input.installments) {
    if (input.filteredInstallmentIds && !input.filteredInstallmentIds.has(row.installment_id)) {
      continue;
    }
    if (!grouped.has(row.student_id)) grouped.set(row.student_id, []);
    grouped.get(row.student_id)?.push(row);
  }

  return Array.from(grouped.entries()).map(([studentId, rows]) => {
    const openTotal = rows.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0);
    const allocatedNow = rows.reduce(
      (sum, row) => sum + installmentAllocationAmount(input.allocationInputs, row.installment_id),
      0,
    );
    const allocatedItemCount = rows.filter(
      (row) => installmentAllocationAmount(input.allocationInputs, row.installment_id) > 0,
    ).length;

    return {
      studentId,
      studentName: rows[0]?.student_name?.trim() || `#${studentId}`,
      classLabel: formatClassLevel(rows[0] ?? { installment_id: 0, student_id: studentId }),
      openTotal,
      allocatedNow,
      remainingAfter: Math.max(0, openTotal - allocatedNow),
      allocatedItemCount,
      hasAllocations: allocatedItemCount > 0,
    };
  });
}

export function resolveDefaultExpandedStudentIds(input: {
  summaries: FamilyStudentAllocationSummary[];
  highlightStudentId?: number;
}): Set<number> {
  const expanded = new Set<number>();
  if (input.highlightStudentId != null) {
    expanded.add(input.highlightStudentId);
    return expanded;
  }
  for (const summary of input.summaries) {
    if (summary.hasAllocations) expanded.add(summary.studentId);
  }
  return expanded;
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

export function isFamilyCollectionPreviewValid(
  preview: FamilyCollectionPreviewResponse | null,
  previewError: string | null,
): boolean {
  return !!preview && !preview.errors.length && previewError == null;
}

export function resolveFamilyCollectionConfirmState(input: {
  step: 'edit' | 'review';
  preview: FamilyCollectionPreviewResponse | null;
  previewError: string | null;
  parsedAmount: number;
  journalId: string;
  paymentMethod: string;
  academicYearId: string;
  collectionDate: string;
  cashSessionBlocked: boolean;
}): { canConfirm: boolean; blockReason: FamilyCollectionConfirmBlockReason | null } {
  if (input.step !== 'review') {
    return { canConfirm: false, blockReason: 'not_in_review' };
  }
  if (!Number.isFinite(input.parsedAmount) || input.parsedAmount <= 0) {
    return { canConfirm: false, blockReason: 'invalid_amount' };
  }
  if (!input.journalId || !input.paymentMethod || !input.academicYearId || !input.collectionDate) {
    return { canConfirm: false, blockReason: 'missing_fields' };
  }
  if (input.cashSessionBlocked) {
    return { canConfirm: false, blockReason: 'cash_session_blocked' };
  }
  if (!input.preview) {
    return { canConfirm: false, blockReason: 'preview_missing' };
  }
  if (input.preview.errors.length || input.previewError) {
    return { canConfirm: false, blockReason: 'preview_errors' };
  }
  return { canConfirm: true, blockReason: null };
}

export function familyCollectionConfirmBlockReasonKey(
  reason: FamilyCollectionConfirmBlockReason,
): string {
  return `admin.finance.billingAccounts.familyCollection.confirmBlockReason.${reason}`;
}
