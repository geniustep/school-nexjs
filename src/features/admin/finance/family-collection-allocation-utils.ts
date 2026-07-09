import type {
  FamilyCollectionAllocationInput,
  FamilyCollectionPreviewResponse,
  FamilyOpenInstallment,
} from '@/types/family-finance';
import { sortInstallmentsForFamilySuggestion } from '@/features/admin/finance/family-suggested-allocation-utils';

export type FamilyInstallmentFilter = 'all' | 'unallocated' | 'registration' | 'tuition' | 'overdue';

export type FamilyCollectionConfirmBlockReason =
  | 'missing_fields'
  | 'cash_session_blocked'
  | 'invalid_amount'
  | 'invalid_allocations';

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

export interface FamilyChildAllocationLine {
  installmentId: number;
  serviceLabel: string;
  allocatedAmount: number;
  installmentRemaining: number;
  isPartial: boolean;
  remainingAfterPayment: number;
}

export interface FamilyChildCompactSummary {
  studentId: number;
  studentName: string;
  classLabel: string;
  allocatedTotal: number;
  lines: FamilyChildAllocationLine[];
}

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

function resolveInstallmentServiceLabel(row: FamilyOpenInstallment): string {
  return row.service_label?.trim() || row.service_type?.trim() || '';
}

export function isPartialFamilyAllocation(
  allocatedAmount: number,
  installmentRemaining: number,
): boolean {
  return (
    allocatedAmount > 0 &&
    installmentRemaining > 0 &&
    allocatedAmount + 0.0001 < installmentRemaining
  );
}

export function buildFamilyChildAllocationLines(input: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
  studentId: number;
}): FamilyChildAllocationLine[] {
  const lines: FamilyChildAllocationLine[] = [];
  for (const row of input.installments) {
    if (row.student_id !== input.studentId) continue;
    const allocatedAmount = installmentAllocationAmount(input.allocationInputs, row.installment_id);
    if (allocatedAmount <= 0) continue;
    const installmentRemaining = row.remaining_amount ?? 0;
    lines.push({
      installmentId: row.installment_id,
      serviceLabel: resolveInstallmentServiceLabel(row),
      allocatedAmount,
      installmentRemaining,
      isPartial: isPartialFamilyAllocation(allocatedAmount, installmentRemaining),
      remainingAfterPayment: Math.max(0, installmentRemaining - allocatedAmount),
    });
  }
  return lines;
}

export function buildFamilyCompactChildSummaries(input: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
}): FamilyChildCompactSummary[] {
  const studentIds = new Set<number>();
  for (const row of input.installments) {
    studentIds.add(row.student_id);
  }

  const summaries: FamilyChildCompactSummary[] = [];
  for (const studentId of studentIds) {
    const lines = buildFamilyChildAllocationLines({
      installments: input.installments,
      allocationInputs: input.allocationInputs,
      studentId,
    });
    if (lines.length === 0) continue;
    const studentRows = input.installments.filter((row) => row.student_id === studentId);
    const allocatedTotal = lines.reduce((sum, line) => sum + line.allocatedAmount, 0);
    summaries.push({
      studentId,
      studentName: studentRows[0]?.student_name?.trim() || `#${studentId}`,
      classLabel: formatClassLevel(studentRows[0] ?? { installment_id: 0, student_id: studentId }),
      allocatedTotal,
      lines,
    });
  }

  return summaries.sort((a, b) => a.studentId - b.studentId);
}

export function buildChildShareTotals(input: {
  installments: FamilyOpenInstallment[];
  allocationInputs: Record<number, string>;
}): Array<{ studentId: number; studentName: string; share: number }> {
  const grouped = new Map<number, FamilyOpenInstallment[]>();
  for (const row of input.installments) {
    if (!grouped.has(row.student_id)) grouped.set(row.student_id, []);
    grouped.get(row.student_id)?.push(row);
  }

  return Array.from(grouped.entries())
    .map(([studentId, rows]) => ({
      studentId,
      studentName: rows[0]?.student_name?.trim() || `#${studentId}`,
      share: rows.reduce(
        (sum, row) => sum + installmentAllocationAmount(input.allocationInputs, row.installment_id),
        0,
      ),
    }))
    .sort((a, b) => a.studentId - b.studentId);
}

export function redistributeChildInstallmentAllocations(input: {
  studentId: number;
  childShare: number;
  installments: FamilyOpenInstallment[];
  currentInputs: Record<number, string>;
}): Record<number, string> {
  const childInstallments = input.installments.filter((row) => row.student_id === input.studentId);
  const sorted = sortInstallmentsForFamilySuggestion(childInstallments);
  let remaining = Math.max(0, input.childShare);
  const next = { ...input.currentInputs };

  for (const row of childInstallments) {
    delete next[row.installment_id];
  }

  for (const row of sorted) {
    if (remaining <= 0) break;
    const due = row.remaining_amount ?? 0;
    if (due <= 0) continue;
    const allocated = Math.min(remaining, due);
    next[row.installment_id] = String(allocated);
    remaining -= allocated;
  }

  return next;
}

export function applyChildShareTotals(input: {
  shares: Record<number, string>;
  installments: FamilyOpenInstallment[];
  currentInputs: Record<number, string>;
}): Record<number, string> {
  let next = { ...input.currentInputs };
  for (const row of input.installments) {
    delete next[row.installment_id];
  }
  for (const [studentIdRaw, rawShare] of Object.entries(input.shares)) {
    const studentId = Number(studentIdRaw);
    const share = Number(rawShare);
    if (!Number.isFinite(studentId) || studentId <= 0) continue;
    if (!Number.isFinite(share) || share <= 0) continue;
    next = redistributeChildInstallmentAllocations({
      studentId,
      childShare: share,
      installments: input.installments,
      currentInputs: next,
    });
  }
  return next;
}

export function clearChildAllocations(input: {
  studentId: number;
  installments: FamilyOpenInstallment[];
  currentInputs: Record<number, string>;
}): Record<number, string> {
  const next = { ...input.currentInputs };
  for (const row of input.installments) {
    if (row.student_id === input.studentId) {
      delete next[row.installment_id];
    }
  }
  return next;
}

export function fillChildRemainingShare(input: {
  studentId: number;
  targetShare: number;
  installments: FamilyOpenInstallment[];
  currentInputs: Record<number, string>;
}): Record<number, string> {
  const currentShare = buildChildShareTotals({
    installments: input.installments.filter((row) => row.student_id === input.studentId),
    allocationInputs: input.currentInputs,
  })[0]?.share ?? 0;
  const delta = Math.max(0, input.targetShare - currentShare);
  if (delta <= 0) return input.currentInputs;

  const childInstallments = sortInstallmentsForFamilySuggestion(
    input.installments.filter((row) => row.student_id === input.studentId),
  );
  let remaining = delta;
  const next = { ...input.currentInputs };

  for (const row of childInstallments) {
    if (remaining <= 0) break;
    const due = row.remaining_amount ?? 0;
    const already = installmentAllocationAmount(next, row.installment_id);
    const room = Math.max(0, due - already);
    if (room <= 0) continue;
    const add = Math.min(remaining, room);
    next[row.installment_id] = String(already + add);
    remaining -= add;
  }

  return next;
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
  parsedAmount: number;
  journalId: string;
  paymentMethod: string;
  academicYearId: string;
  collectionDate: string;
  cashSessionBlocked: boolean;
  allocationInputs: Record<number, string>;
  installments: FamilyOpenInstallment[];
}): { canConfirm: boolean; blockReason: FamilyCollectionConfirmBlockReason | null } {
  if (!Number.isFinite(input.parsedAmount) || input.parsedAmount <= 0) {
    return { canConfirm: false, blockReason: 'invalid_amount' };
  }
  if (!input.journalId || !input.paymentMethod || !input.academicYearId || !input.collectionDate) {
    return { canConfirm: false, blockReason: 'missing_fields' };
  }
  if (input.cashSessionBlocked) {
    return { canConfirm: false, blockReason: 'cash_session_blocked' };
  }
  const validation = validateFamilyAllocations({
    amount: input.parsedAmount,
    values: input.allocationInputs,
    installments: input.installments,
  });
  if (validation) {
    return { canConfirm: false, blockReason: 'invalid_allocations' };
  }
  return { canConfirm: true, blockReason: null };
}

export function familyCollectionConfirmBlockReasonKey(
  reason: FamilyCollectionConfirmBlockReason,
): string {
  return `admin.finance.billingAccounts.familyCollection.confirmBlockReason.${reason}`;
}
